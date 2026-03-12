"""
PDF generation service for QuoteGuard quotes.

Uses Jinja2 for HTML templating and WeasyPrint for PDF rendering.
Generated PDFs are uploaded to Supabase Storage under
``quotes/{user_id}/{quote_id}.pdf``.
"""

from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Any

from jinja2 import Environment, BaseLoader

logger = logging.getLogger(__name__)

# ───────────────────────── HTML Template ─────────────────────────────

QUOTE_HTML_TEMPLATE = """\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  @page {
    size: A4;
    margin: 20mm 18mm 25mm 18mm;
    @bottom-center {
      content: "Page " counter(page) " of " counter(pages);
      font-size: 9px;
      color: #888;
    }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 12px;
    color: #1a1a2e;
    line-height: 1.5;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 30px;
    border-bottom: 3px solid #4F46E5;
    padding-bottom: 18px;
  }
  .brand h1 {
    font-size: 22px;
    color: #4F46E5;
    margin-bottom: 4px;
  }
  .brand p {
    font-size: 11px;
    color: #555;
  }
  .quote-meta {
    text-align: right;
    font-size: 11px;
  }
  .quote-meta .label {
    color: #888;
    text-transform: uppercase;
    font-size: 9px;
    letter-spacing: 0.5px;
  }
  .quote-meta .value {
    font-weight: 600;
    color: #1a1a2e;
  }
  h2 {
    font-size: 16px;
    color: #1a1a2e;
    margin: 24px 0 10px 0;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 6px;
  }
  .summary {
    margin-bottom: 16px;
    color: #444;
    font-size: 12px;
  }
  /* ── Line items table ── */
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 16px;
  }
  th {
    background: #f8f9fa;
    text-align: left;
    padding: 8px 10px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: #555;
    border-bottom: 2px solid #e5e7eb;
  }
  td {
    padding: 8px 10px;
    border-bottom: 1px solid #f0f0f0;
    font-size: 11px;
  }
  tr:last-child td { border-bottom: none; }
  .text-right { text-align: right; }
  /* ── Totals ── */
  .totals {
    width: 280px;
    margin-left: auto;
    margin-bottom: 28px;
  }
  .totals .row {
    display: flex;
    justify-content: space-between;
    padding: 5px 0;
    font-size: 12px;
  }
  .totals .row.grand {
    border-top: 2px solid #4F46E5;
    margin-top: 6px;
    padding-top: 8px;
    font-weight: 700;
    font-size: 14px;
    color: #4F46E5;
  }
  /* ── Milestones ── */
  .milestone {
    background: #f8f9fa;
    border-left: 3px solid #7C3AED;
    padding: 10px 14px;
    margin-bottom: 8px;
    border-radius: 0 4px 4px 0;
  }
  .milestone .ms-title {
    font-weight: 600;
    font-size: 12px;
    color: #1a1a2e;
  }
  .milestone .ms-desc {
    font-size: 11px;
    color: #555;
  }
  .milestone .ms-amount {
    font-size: 11px;
    font-weight: 600;
    color: #7C3AED;
    margin-top: 2px;
  }
  /* ── Footer ── */
  .footer {
    margin-top: 40px;
    border-top: 1px solid #e5e7eb;
    padding-top: 12px;
    font-size: 9px;
    color: #999;
  }
  .footer .hash {
    font-family: 'Courier New', Courier, monospace;
    word-break: break-all;
  }
</style>
</head>
<body>

<div class="header">
  <div class="brand">
    <h1>{{ business_name | default("QuoteGuard") }}</h1>
    {% if business_email %}
    <p>{{ business_email }}</p>
    {% endif %}
    {% if business_phone %}
    <p>{{ business_phone }}</p>
    {% endif %}
  </div>
  <div class="quote-meta">
    <div><span class="label">Quote ID</span><br><span class="value">{{ quote_id_short }}</span></div>
    <div style="margin-top:8px"><span class="label">Date</span><br><span class="value">{{ issue_date }}</span></div>
    {% if client_name %}
    <div style="margin-top:8px"><span class="label">Client</span><br><span class="value">{{ client_name }}</span></div>
    {% endif %}
  </div>
</div>

<h2>{{ title }}</h2>
<p class="summary">{{ summary }}</p>

<h2>Line Items</h2>
<table>
  <thead>
    <tr>
      <th style="width:45%">Description</th>
      <th class="text-right">Qty</th>
      <th>Unit</th>
      <th class="text-right">Unit Price</th>
      <th class="text-right">Total</th>
    </tr>
  </thead>
  <tbody>
    {% for item in line_items %}
    <tr>
      <td>{{ item.description }}</td>
      <td class="text-right">{{ item.quantity }}</td>
      <td>{{ item.unit }}</td>
      <td class="text-right">{{ currency_symbol }}{{ "%.2f" | format(item.unit_price / 100) }}</td>
      <td class="text-right">{{ currency_symbol }}{{ "%.2f" | format(item.total / 100) }}</td>
    </tr>
    {% endfor %}
  </tbody>
</table>

<div class="totals">
  <div class="row">
    <span>Subtotal</span>
    <span>{{ currency_symbol }}{{ "%.2f" | format(subtotal / 100) }}</span>
  </div>
  {% if vat_amount > 0 %}
  <div class="row">
    <span>VAT ({{ vat_rate_display }})</span>
    <span>{{ currency_symbol }}{{ "%.2f" | format(vat_amount / 100) }}</span>
  </div>
  {% endif %}
  <div class="row grand">
    <span>Total</span>
    <span>{{ currency_symbol }}{{ "%.2f" | format(total_amount / 100) }}</span>
  </div>
</div>

{% if milestones %}
<h2>Payment Schedule</h2>
{% for ms in milestones %}
<div class="milestone">
  <div class="ms-title">{{ ms.sequence_number }}. {{ ms.title }}</div>
  <div class="ms-desc">{{ ms.description }}</div>
  <div class="ms-amount">{{ currency_symbol }}{{ "%.2f" | format(ms.amount_fiat / 100) }}</div>
</div>
{% endfor %}
{% endif %}

<div class="footer">
  <p>Generated by QuoteGuard on {{ generated_at }}.</p>
  {% if content_hash %}
  <p>Content hash: <span class="hash">{{ content_hash }}</span></p>
  {% endif %}
  <p style="margin-top: 4px">This quote is subject to the terms and conditions agreed between the parties.</p>
</div>

</body>
</html>
"""

# Jinja2 environment with the template loaded from string
_env = Environment(loader=BaseLoader(), autoescape=True)
_template = _env.from_string(QUOTE_HTML_TEMPLATE)


# ───────────────────── Currency helpers ───────────────────────────────

CURRENCY_SYMBOLS: dict[str, str] = {
    "GBP": "\u00a3",
    "USD": "$",
    "EUR": "\u20ac",
    "SGD": "S$",
    "AUD": "A$",
}


def _currency_symbol(code: str) -> str:
    return CURRENCY_SYMBOLS.get(code, code)


# ──────────────────── Public API ─────────────────────────────────────


def generate_quote_pdf(
    quote: dict[str, Any],
    project: dict[str, Any],
    milestones: list[dict[str, Any]],
    business_info: dict[str, Any],
) -> bytes:
    """
    Render a professional PDF for the given quote.

    Parameters
    ----------
    quote : dict
        Row from the ``quotes`` table.
    project : dict
        Row from the ``projects`` table.
    milestones : list[dict]
        Rows from the ``milestones`` table, ordered by sequence_number.
    business_info : dict
        Keys: ``business_name``, ``business_email``, ``business_phone``,
        ``currency_code``, ``vat_rate``.

    Returns
    -------
    bytes
        The rendered PDF file contents.
    """
    from weasyprint import HTML  # lazy import to avoid startup cost

    currency_code = business_info.get("currency_code", quote.get("currency_code", "GBP"))
    symbol = _currency_symbol(currency_code)
    vat_rate = float(business_info.get("vat_rate", 0.20))
    vat_amount = quote.get("vat_amount", 0)

    # Compute content hash if not already present
    content_hash = quote.get("content_hash", "")
    if not content_hash:
        hash_payload = json.dumps(quote, sort_keys=True, default=str)
        content_hash = hashlib.sha256(hash_payload.encode()).hexdigest()

    # Prepare line items — stored as dicts or possibly JSON string
    raw_items = quote.get("line_items", [])
    if isinstance(raw_items, str):
        raw_items = json.loads(raw_items)

    # Sort milestones by sequence number
    sorted_milestones = sorted(
        milestones, key=lambda m: m.get("sequence_number", 0)
    )

    quote_id = str(quote.get("id", ""))

    context = {
        "business_name": business_info.get("business_name", "QuoteGuard"),
        "business_email": business_info.get("business_email", ""),
        "business_phone": business_info.get("business_phone", ""),
        "quote_id_short": quote_id[:8].upper() if len(quote_id) >= 8 else quote_id.upper(),
        "issue_date": datetime.now(timezone.utc).strftime("%d %B %Y"),
        "client_name": project.get("client_name", ""),
        "title": quote.get("title", project.get("title", "Untitled")),
        "summary": quote.get("summary", project.get("description", "")),
        "line_items": raw_items,
        "subtotal": quote.get("subtotal", 0),
        "vat_amount": vat_amount,
        "vat_rate_display": f"{vat_rate * 100:.0f}%",
        "total_amount": quote.get("total_amount", 0),
        "currency_symbol": symbol,
        "milestones": sorted_milestones,
        "content_hash": content_hash,
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
    }

    html_string = _template.render(**context)
    pdf_bytes: bytes = HTML(string=html_string).write_pdf()

    logger.info(
        "Generated PDF for quote %s (%d bytes)",
        quote_id,
        len(pdf_bytes),
    )
    return pdf_bytes


def upload_quote_pdf(
    supabase: Any,
    user_id: str,
    quote_id: str,
    pdf_bytes: bytes,
) -> str:
    """
    Upload a quote PDF to Supabase Storage.

    The file is stored at ``quotes/{user_id}/{quote_id}.pdf`` in the
    ``quote-pdfs`` bucket. Returns the storage path.
    """
    storage_path = f"{user_id}/{quote_id}.pdf"
    bucket = supabase.storage.from_("quote-pdfs")

    # Attempt to remove any existing file (ignore errors)
    try:
        bucket.remove([storage_path])
    except Exception:
        pass

    bucket.upload(
        path=storage_path,
        file=pdf_bytes,
        file_options={"content-type": "application/pdf", "upsert": "true"},
    )

    logger.info("Uploaded PDF to quote-pdfs/%s", storage_path)
    return f"quote-pdfs/{storage_path}"
