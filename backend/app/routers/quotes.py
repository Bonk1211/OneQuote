import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from app.dependencies import get_current_user, get_supabase
from app.models.quote import QuoteUpdate
from app.services.pdf_generator import generate_quote_pdf, upload_quote_pdf
from app.utils.supabase_helpers import safe_maybe_single

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/quotes", tags=["quotes"])


@router.get("/")
async def list_quotes(
    user=Depends(get_current_user), supabase=Depends(get_supabase)
):
    resp = (
        supabase.table("quotes")
        .select("*, projects(title, status, client_name)")
        .eq("user_id", str(user.id))
        .order("created_at", desc=True)
        .execute()
    )
    return resp.data


@router.get("/{quote_id}")
async def get_quote(
    quote_id: str,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    resp = (
        supabase.table("quotes")
        .select("*, projects(*, milestones(*))")
        .eq("id", quote_id)
        .eq("user_id", str(user.id))
        .single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(404, "Quote not found")
    return resp.data


@router.patch("/{quote_id}")
async def update_quote(
    quote_id: str,
    data: QuoteUpdate,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    payload = {k: v for k, v in data.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(400, "No fields to update")

    # Serialize line_items to dicts if present
    if "line_items" in payload:
        payload["line_items"] = [
            li.model_dump() if hasattr(li, "model_dump") else li
            for li in payload["line_items"]
        ]

    resp = (
        supabase.table("quotes")
        .update(payload)
        .eq("id", quote_id)
        .eq("user_id", str(user.id))
        .execute()
    )
    if not resp.data:
        raise HTTPException(404, "Quote not found")
    return resp.data[0]


@router.patch("/{quote_id}/status")
async def update_quote_status(
    quote_id: str,
    status: str,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    valid = {"draft", "approved", "sent", "accepted", "rejected", "expired"}
    if status not in valid:
        raise HTTPException(400, f"Invalid status. Must be one of: {valid}")

    resp = (
        supabase.table("quotes")
        .update({"status": status})
        .eq("id", quote_id)
        .eq("user_id", str(user.id))
        .execute()
    )
    if not resp.data:
        raise HTTPException(404, "Quote not found")
    return resp.data[0]


@router.get("/{quote_id}/pdf")
async def download_quote_pdf(
    quote_id: str,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """
    Generate and return a PDF for the given quote.

    The PDF is also uploaded to Supabase Storage for future
    retrieval at ``quote-pdfs/{user_id}/{quote_id}.pdf``.
    """
    # 1. Fetch the quote (with nested project and milestones)
    quote_resp = (
        supabase.table("quotes")
        .select("*")
        .eq("id", quote_id)
        .eq("user_id", str(user.id))
        .single()
        .execute()
    )
    if not quote_resp.data:
        raise HTTPException(404, "Quote not found")
    quote = quote_resp.data

    # 2. Fetch the project
    project_resp = (
        supabase.table("projects")
        .select("*")
        .eq("id", quote["project_id"])
        .single()
        .execute()
    )
    if not project_resp.data:
        raise HTTPException(404, "Project not found")
    project = project_resp.data

    # 3. Fetch milestones
    milestones_resp = (
        supabase.table("milestones")
        .select("*")
        .eq("quote_id", quote_id)
        .order("sequence_number")
        .execute()
    )
    milestones = milestones_resp.data or []

    # 4. Fetch business info
    user_resp = safe_maybe_single(
        supabase.table("users")
        .select("business_name, email, phone, currency_code")
        .eq("id", str(user.id))
        .maybe_single()
    )
    user_data = user_resp.data or {}

    overheads_resp = safe_maybe_single(
        supabase.table("base_overheads")
        .select("vat_rate, vat_registered")
        .eq("user_id", str(user.id))
        .maybe_single()
    )
    overheads = overheads_resp.data or {}

    business_info = {
        "business_name": user_data.get("business_name", ""),
        "business_email": user_data.get("email", ""),
        "business_phone": user_data.get("phone", ""),
        "currency_code": user_data.get("currency_code", "GBP"),
        "vat_rate": overheads.get("vat_rate", 0.20),
    }

    # 5. Generate PDF
    try:
        pdf_bytes = generate_quote_pdf(
            quote=quote,
            project=project,
            milestones=milestones,
            business_info=business_info,
        )
    except Exception as exc:
        logger.exception("PDF generation failed for quote %s", quote_id)
        raise HTTPException(500, f"PDF generation failed: {str(exc)}")

    # 6. Upload to Supabase Storage (non-blocking, best-effort)
    try:
        upload_quote_pdf(supabase, str(user.id), quote_id, pdf_bytes)
    except Exception:
        logger.warning(
            "PDF upload to storage failed for quote %s (non-fatal)",
            quote_id,
            exc_info=True,
        )

    # 7. Return the PDF
    filename = f"OneQuote-{quote_id[:8].upper()}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
