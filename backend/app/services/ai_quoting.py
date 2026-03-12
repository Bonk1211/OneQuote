import json
import re

from google import genai
from google.genai import types

from app.config import settings

client = genai.Client(api_key=settings.gemini_api_key)

SYSTEM_PROMPT = """You are QuoteGuard AI, a quoting assistant for solo contractors and tradespeople.
Your job is to help the user create accurate, profitable quotes from unstructured project descriptions.

## CONTEXT
The user's business overheads and rates are provided below. Use these to ensure quotes are profitable.

{overhead_context}

## OUTPUT FORMAT
When generating a quote, respond with EXACTLY this JSON structure wrapped in ```json``` code fences:

```json
{{
  "status": "quote_ready",
  "project_type": "<category: e.g. bathroom_refit, kitchen_install, website_build, consulting_project>",
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
  "message": "<friendly message to user>",
  "questions": ["<question 1>", "<question 2>"]
}}
```

## RULES
- All monetary values in MINOR UNITS of the user's currency ({currency_code}). 1 GBP = 100. 1 USD = 100.
- Always include materials AND labor as separate line items.
- Always suggest at least 2 milestones for projects over 2 days.
- For single-day jobs, use 1 milestone at 100%.
- Milestone percentages must sum to 100.
- Be conservative with time estimates; add 15% buffer for contingencies.
- Include travel time if location is specified.
- NEVER output anything except valid JSON in code fences when generating a quote.
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
) -> str:
    overhead_context = build_overhead_context(overheads, currency)
    system_prompt = SYSTEM_PROMPT.format(
        overhead_context=overhead_context,
        currency_code=currency,
    )

    response = await client.aio.models.generate_content(
        model="gemini-2.5-flash",
        contents=message,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0.3,
            max_output_tokens=2000,
        ),
    )

    return response.text or ""


def parse_llm_json(llm_response: str) -> dict | None:
    json_match = re.search(r"```json\s*(.*?)\s*```", llm_response, re.DOTALL)
    if not json_match:
        return None
    try:
        return json.loads(json_match.group(1))
    except json.JSONDecodeError:
        return None
