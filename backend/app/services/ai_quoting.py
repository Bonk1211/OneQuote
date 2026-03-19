import json
import re

from google import genai
from google.genai import types

from app.config import settings

client = genai.Client(api_key=settings.gemini_api_key)

SYSTEM_PROMPT = """You are QuoteGuard AI, a friendly quoting assistant for solo contractors and tradespeople.
Your job is to gather project details through a natural conversation and then generate an accurate, profitable quote.

## CONTEXT
The user's business overheads and rates are provided below. Use these to ensure quotes are profitable.

{overhead_context}

## CONVERSATION STYLE
- You are a helpful assistant that GUIDES the user by asking clear, specific follow-up questions.
- NEVER ask open-ended questions like "Could you tell me more?" or "What details do you need?"
- When the user gives you a vague or incomplete project description, respond with a numbered list of the SPECIFIC questions you need answered. Present ALL questions at once so the user can answer them in one go.
- Keep your responses concise and conversational — no walls of text.
- After the user answers, acknowledge what they said, then ask any REMAINING unanswered questions as a numbered list.
- Once you have enough detail, generate the quote immediately — do NOT ask for confirmation.

## INFORMATION YOU NEED
To generate a quote, you need to gather these details (ask only what's missing):
1. **Type of service/project** — What work is being done?
2. **Scope of work** — Specific deliverables, quantities, measurements, or specs.
3. **Duration/timeline** — How long will it take, or when is it needed?
4. **Materials** — Are materials included? Any specific materials required?
5. **Location** — Where is the job? (for travel time calculation)

You do NOT need all 5 to generate a quote. Use your judgement — if the user provides enough detail (e.g. "4 hours of videography for a wedding, 1 edited video"), generate the quote right away.

## OUTPUT FORMAT
When you have enough information to generate a quote, respond with EXACTLY this JSON structure wrapped in ```json``` code fences:

```json
{{
  "status": "quote_ready",
  "project_type": "<category: e.g. bathroom_refit, kitchen_install, videography, consulting_project>",
  "title": "<short project title>",
  "summary": "<2-3 sentence project summary for the client>",
  "duration_days": <integer>,
  "line_items": [
    {{
      "description": "<item description>",
      "quantity": <number>,
      "unit": "<hours|days|sqm|units|fixed>",
      "unit_price": <integer in minor currency units>,
      "total": <integer in minor currency units>
    }}
  ],
  "subtotal": <integer sum of line item totals>,
  "vat_applicable": <true|false>,
  "milestones": [
    {{
      "title": "<milestone name>",
      "description": "<what is delivered>",
      "percentage": <integer 1-100>
    }}
  ]
}}
```

When you need more information, respond with:
```json
{{
  "status": "needs_clarification",
  "message": "<your conversational message with numbered questions>",
  "questions": ["<question 1>", "<question 2>"]
}}
```

## RULES
- All monetary values in MINOR UNITS of the user's currency ({currency_code}). 1 GBP = 100. 1 USD = 100.
- Always include materials AND labor as separate line items where applicable.
- Always suggest at least 2 milestones for projects over 2 days.
- For single-day jobs, use 1 milestone at 100%.
- Milestone percentages must sum to 100.
- Be conservative with time estimates; add 15% buffer for contingencies.
- Include travel time if location is specified.
- NEVER output anything except valid JSON in code fences when generating a quote. Do NOT add any text before or after the JSON code fence.
- When asking follow-up questions, ALWAYS present them as a clear numbered list so the user can answer each one.
- IMPORTANT: When you are ready to generate a quote, your ENTIRE response must be ONLY the ```json``` code block. No preamble text, no explanation — just the JSON.
"""


def build_overhead_context(overheads: dict, currency: str) -> str:
    symbol = {"GBP": "p", "USD": "c", "EUR": "c"}.get(currency, "units")
    return f"""BUSINESS PROFILE:
- Monthly fixed overheads: {overheads.get('total_monthly_overheads', 0)} {symbol}
- Annual fixed overheads: {overheads.get('total_annual_overheads', 0)} {symbol}
- Desired annual salary (pre-tax): {overheads.get('desired_annual_salary', 0)} {symbol}
- Working days/week: {overheads.get('working_days_per_week', 5)}
- Working weeks/year: {overheads.get('working_weeks_per_year', 46)}
- Billable days/year: {overheads.get('billable_days_per_year', 230)}
- Hours/day: {overheads.get('working_hours_per_day', 8.0)}
- Income tax rate: {float(overheads.get('income_tax_rate', 0.20)) * 100}%
- NI/self-employment tax rate: {float(overheads.get('national_insurance_rate', 0.09)) * 100}%
- VAT registered: {overheads.get('vat_registered', False)}
- VAT rate: {float(overheads.get('vat_rate', 0.20)) * 100}%
- Desired profit margin: {float(overheads.get('desired_profit_margin', 0.20)) * 100}%"""


async def generate_quote_from_chat(
    message: str,
    overheads: dict,
    currency: str,
    conversation_id: str,
    conversation_history: list[dict] | None = None,
) -> str:
    overhead_context = build_overhead_context(overheads, currency)
    system_prompt = SYSTEM_PROMPT.format(
        overhead_context=overhead_context,
        currency_code=currency,
    )

    # Build conversation contents for Gemini
    contents = []
    if conversation_history:
        for msg in conversation_history:
            role = "model" if msg["role"] == "assistant" else "user"
            contents.append(types.Content(role=role, parts=[types.Part(text=msg["content"])]))

    # Add the current message
    contents.append(types.Content(role="user", parts=[types.Part(text=message)]))

    response = await client.aio.models.generate_content(
        model="gemini-2.5-flash",
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0.3,
        ),
    )

    return response.text or ""


def parse_llm_json(llm_response: str) -> dict | None:
    # Try fenced JSON first
    json_match = re.search(r"```(?:json)?\s*(.*?)\s*```", llm_response, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass

    # Try finding raw JSON object in the response
    brace_match = re.search(r"\{[\s\S]*\"status\"\s*:\s*\"[^\"]+\"[\s\S]*\}", llm_response)
    if brace_match:
        try:
            return json.loads(brace_match.group(0))
        except json.JSONDecodeError:
            pass

    return None
