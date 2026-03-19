import hashlib
import json
import re
import uuid

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user, get_supabase
from app.models.chat import ChatRequest, ChatResponse, ParsedQuote
from app.services.ai_quoting import generate_quote_from_chat, parse_llm_json
from app.services.profitability import calculate_profitability
from app.utils.supabase_helpers import safe_maybe_single

router = APIRouter(prefix="/api/chat", tags=["chat"])


def _strip_json_from_message(text: str) -> str:
    """Remove raw JSON blocks from LLM text so users never see raw JSON."""
    # Remove fenced code blocks
    text = re.sub(r"```(?:json)?\s*\{[\s\S]*?```", "", text)
    # Remove unfenced JSON objects (starting with { and containing "status")
    text = re.sub(r"\{[\s\S]*\"status\"\s*:[\s\S]*", "", text)
    return text.strip()


def _save_message(supabase, conversation_id: str, role: str, content: str, parsed_quote=None, profit_analysis=None):
    """Persist a single chat message to the database."""
    row = {
        "conversation_id": conversation_id,
        "role": role,
        "content": content,
    }
    if parsed_quote is not None:
        row["parsed_quote"] = parsed_quote if isinstance(parsed_quote, dict) else parsed_quote.model_dump()
    if profit_analysis is not None:
        row["profit_analysis"] = profit_analysis if isinstance(profit_analysis, dict) else profit_analysis.model_dump()
    supabase.table("chat_messages").insert(row).execute()


def _ensure_conversation(supabase, conversation_id: str, user_id: str, title: str = "New Quote") -> str:
    """Create conversation row if it doesn't exist. Returns conversation_id."""
    existing = safe_maybe_single(
        supabase.table("conversations")
        .select("id")
        .eq("id", conversation_id)
        .maybe_single()
    )
    if not existing.data:
        supabase.table("conversations").insert({
            "id": conversation_id,
            "user_id": user_id,
            "title": title,
        }).execute()
    return conversation_id


@router.post("/quote", response_model=ChatResponse)
async def chat_quote(
    req: ChatRequest,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    # 1. Fetch overheads
    overheads_resp = safe_maybe_single(
        supabase.table("base_overheads")
        .select("*")
        .eq("user_id", str(user.id))
        .maybe_single()
    )
    if not overheads_resp.data:
        raise HTTPException(400, "Please set up your business overheads first.")
    overheads = overheads_resp.data

    # 2. Get currency
    user_resp = (
        supabase.table("users")
        .select("currency_code")
        .eq("id", str(user.id))
        .single()
        .execute()
    )
    currency = user_resp.data.get("currency_code", "GBP")

    # 3. Resolve conversation
    conversation_id = req.conversation_id or str(uuid.uuid4())
    _ensure_conversation(supabase, conversation_id, str(user.id))

    # 4. Load history from DB (source of truth, ignoring frontend-sent history)
    history_resp = (
        supabase.table("chat_messages")
        .select("role,content")
        .eq("conversation_id", conversation_id)
        .order("created_at")
        .execute()
    )
    history = [{"role": m["role"], "content": m["content"]} for m in (history_resp.data or [])]

    # 5. Save user message
    _save_message(supabase, conversation_id, "user", req.message)

    # 6. Call LLM
    llm_response = await generate_quote_from_chat(
        message=req.message,
        overheads=overheads,
        currency=currency,
        conversation_id=conversation_id,
        conversation_history=history,
    )

    # 7. Parse
    parsed = parse_llm_json(llm_response)
    if parsed is None:
        # Strip any raw/broken JSON from the displayed message
        clean_msg = _strip_json_from_message(llm_response)
        if not clean_msg.strip():
            clean_msg = "I'm working on your quote but had a formatting issue. Could you try describing the project once more?"
        _save_message(supabase, conversation_id, "assistant", clean_msg)
        return ChatResponse(
            message=clean_msg,
            conversation_id=conversation_id,
        )

    # 8. Handle clarification
    if parsed.get("status") == "needs_clarification":
        ai_msg = parsed.get("message", "Could you provide more details?")
        questions = parsed.get("questions", [])
        # Append numbered questions to the message so the user sees the full response
        if questions:
            ai_msg = ai_msg.rstrip().rstrip(":")
            ai_msg += ":\n\n" + "\n".join(f"{i+1}. {q}" for i, q in enumerate(questions))
        _save_message(supabase, conversation_id, "assistant", ai_msg)
        # Update conversation title from first user message
        _update_conversation_title(supabase, conversation_id, req.message)
        return ChatResponse(
            message=ai_msg,
            conversation_id=conversation_id,
            requires_clarification=True,
            clarification_questions=questions,
        )

    # 9. Build quote
    try:
        quote_data = ParsedQuote(
            project_type=parsed.get("project_type", "general"),
            title=parsed.get("title", "Untitled Project"),
            summary=parsed.get("summary", ""),
            duration_days=parsed.get("duration_days", 1),
            line_items=parsed.get("line_items", []),
            subtotal=parsed.get("subtotal", 0),
            vat_amount=0,
            total_amount=parsed.get("subtotal", 0),
            milestones=parsed.get("milestones", []),
        )
    except Exception:
        err_msg = "I had trouble structuring that quote. Could you rephrase your project details?"
        _save_message(supabase, conversation_id, "assistant", err_msg)
        return ChatResponse(
            message=err_msg,
            conversation_id=conversation_id,
            requires_clarification=True,
        )

    # 10. Calculate VAT if applicable
    if overheads.get("vat_registered") and parsed.get("vat_applicable", False):
        vat_rate = float(overheads.get("vat_rate", 0.20))
        quote_data.vat_amount = int(quote_data.subtotal * vat_rate)
        quote_data.total_amount = quote_data.subtotal + quote_data.vat_amount

    # 11. Compute labor hours and material cost from line items
    hours_per_day = float(overheads.get("working_hours_per_day", 8.0))
    labor_hours_total = sum(
        li.quantity * hours_per_day if li.unit == "days" else li.quantity
        for li in quote_data.line_items
        if li.unit in ("hours", "days")
    )
    material_cost = sum(
        li.total for li in quote_data.line_items if li.unit not in ("hours", "days")
    )

    # 12. Run profitability engine
    profit_analysis = calculate_profitability(
        quote_subtotal=quote_data.subtotal,
        labor_hours=labor_hours_total,
        material_cost=material_cost,
        project_duration_days=quote_data.duration_days,
        overheads=overheads,
    )

    # 13. Store project + quote + milestones
    project_resp = (
        supabase.table("projects")
        .insert(
            {
                "user_id": str(user.id),
                "title": quote_data.title,
                "project_type": quote_data.project_type,
                "description": quote_data.summary,
                "estimated_duration_days": quote_data.duration_days,
                "total_quoted_amount": quote_data.total_amount,
                "status": "draft",
            }
        )
        .execute()
    )
    project_id = project_resp.data[0]["id"]

    content_hash = hashlib.sha256(
        json.dumps(quote_data.model_dump(), sort_keys=True, default=str).encode()
    ).hexdigest()

    quote_resp = (
        supabase.table("quotes")
        .insert(
            {
                "project_id": project_id,
                "user_id": str(user.id),
                "title": quote_data.title,
                "summary": quote_data.summary,
                "line_items": [li.model_dump() for li in quote_data.line_items],
                "subtotal": quote_data.subtotal,
                "vat_amount": quote_data.vat_amount,
                "total_amount": quote_data.total_amount,
                "currency_code": currency,
                "labor_hours": labor_hours_total,
                "labor_cost": profit_analysis.labor_cost,
                "material_cost": material_cost,
                "overhead_allocation": profit_analysis.overhead_allocation,
                "break_even_amount": profit_analysis.break_even_amount,
                "profit_amount": profit_analysis.profit_amount,
                "profit_margin_percent": profit_analysis.profit_margin_percent,
                "min_daily_rate": profit_analysis.min_daily_rate,
                "recommended_daily_rate": (
                    int(profit_analysis.recommended_quote / quote_data.duration_days)
                    if quote_data.duration_days > 0
                    else 0
                ),
                "is_profitable": profit_analysis.is_profitable,
                "ai_conversation_id": conversation_id,
                "ai_model_used": "gemini-2.5-flash",
                "ai_raw_response": parsed,
                "content_hash": content_hash,
                "status": "draft",
            }
        )
        .execute()
    )

    # Store milestones
    for i, ms in enumerate(quote_data.milestones):
        ms_amount = int(quote_data.subtotal * ms.get("percentage", 0) / 100)
        ms_desc_hash = hashlib.sha256(
            f"{ms.get('title', '')}:{ms.get('description', '')}:{ms_amount}".encode()
        ).hexdigest()
        supabase.table("milestones").insert(
            {
                "project_id": project_id,
                "quote_id": quote_resp.data[0]["id"],
                "title": ms.get("title", f"Milestone {i + 1}"),
                "description": ms.get("description", ""),
                "sequence_number": i + 1,
                "amount_fiat": ms_amount,
                "description_hash": ms_desc_hash,
                "status": "pending",
            }
        ).execute()

    # Link conversation to project
    supabase.table("conversations").update({
        "project_id": project_id,
        "title": quote_data.title,
    }).eq("id", conversation_id).execute()

    # 14. Build human response
    currency_symbol = {"GBP": "\u00a3", "USD": "$", "EUR": "\u20ac"}.get(
        currency, currency
    )
    human_msg = f"""Here's your quote for **{quote_data.title}**:

**Duration**: {quote_data.duration_days} days
**Subtotal**: {currency_symbol}{quote_data.subtotal / 100:,.2f}
{"**VAT**: " + currency_symbol + f"{quote_data.vat_amount / 100:,.2f}" if quote_data.vat_amount else ""}
**Total**: {currency_symbol}{quote_data.total_amount / 100:,.2f}

**Profitability Check**:
- Break-even: {currency_symbol}{profit_analysis.break_even_amount / 100:,.2f}
- Profit margin: {profit_analysis.profit_margin_percent}%
- Min daily rate: {currency_symbol}{profit_analysis.min_daily_rate / 100:,.2f}
- {"PROFITABLE" if profit_analysis.is_profitable else "NOT PROFITABLE - REVIEW PRICING"}"""

    if profit_analysis.warnings:
        human_msg += "\n\n**Warnings**:\n" + "\n".join(
            f"- {w}" for w in profit_analysis.warnings
        )

    # Save assistant response
    _save_message(supabase, conversation_id, "assistant", human_msg,
                  parsed_quote=quote_data, profit_analysis=profit_analysis)

    return ChatResponse(
        message=human_msg,
        parsed_quote=quote_data,
        profit_analysis=profit_analysis,
        conversation_id=conversation_id,
    )


def _update_conversation_title(supabase, conversation_id: str, first_message: str):
    """Set conversation title from the first user message (truncated)."""
    title = first_message[:80].strip()
    if len(first_message) > 80:
        title += "..."
    supabase.table("conversations").update({
        "title": title,
        "updated_at": "now()",
    }).eq("id", conversation_id).execute()


@router.get("/conversations")
async def list_conversations(
    user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """List all conversations for the current user, newest first."""
    resp = (
        supabase.table("conversations")
        .select("id,title,project_id,created_at,updated_at")
        .eq("user_id", str(user.id))
        .order("updated_at", desc=True)
        .execute()
    )
    return resp.data or []


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Get all messages for a conversation."""
    # Verify ownership
    conv = safe_maybe_single(
        supabase.table("conversations")
        .select("*")
        .eq("id", conversation_id)
        .eq("user_id", str(user.id))
        .maybe_single()
    )
    if not conv.data:
        raise HTTPException(404, "Conversation not found")

    messages_resp = (
        supabase.table("chat_messages")
        .select("id,role,content,parsed_quote,profit_analysis,created_at")
        .eq("conversation_id", conversation_id)
        .order("created_at")
        .execute()
    )

    return {
        "conversation": conv.data,
        "messages": messages_resp.data or [],
    }
