"""
PDF generation service for QuoteGuard quotes.

Uses fpdf2 for PDF rendering — pure Python, no system dependencies.
Generated PDFs are uploaded to Supabase Storage under
``quotes/{user_id}/{quote_id}.pdf``.
"""

from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Any

from fpdf import FPDF

logger = logging.getLogger(__name__)

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


def _fmt(amount_minor: int, symbol: str) -> str:
    return f"{symbol}{amount_minor / 100:,.2f}"


# ──────────────────── PDF Builder ────────────────────────────────────

class QuotePDF(FPDF):
    """Custom PDF with header/footer for QuoteGuard quotes."""

    def __init__(self, business_name: str, **kwargs: Any):
        super().__init__(**kwargs)
        self.business_name = business_name or "QuoteGuard"

    def footer(self) -> None:
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")


# ──────────────────── Public API ─────────────────────────────────────

def generate_quote_pdf(
    quote: dict[str, Any],
    project: dict[str, Any],
    milestones: list[dict[str, Any]],
    business_info: dict[str, Any],
) -> bytes:
    currency_code = business_info.get("currency_code", quote.get("currency_code", "USD"))
    symbol = _currency_symbol(currency_code)
    vat_amount = quote.get("vat_amount", 0)
    vat_rate = float(business_info.get("vat_rate", 0.20))

    content_hash = quote.get("content_hash", "")
    if not content_hash:
        hash_payload = json.dumps(quote, sort_keys=True, default=str)
        content_hash = hashlib.sha256(hash_payload.encode()).hexdigest()

    raw_items = quote.get("line_items", [])
    if isinstance(raw_items, str):
        raw_items = json.loads(raw_items)

    sorted_milestones = sorted(milestones, key=lambda m: m.get("sequence_number", 0))

    quote_id = str(quote.get("id", ""))
    quote_id_short = quote_id[:8].upper() if len(quote_id) >= 8 else quote_id.upper()
    issue_date = datetime.now(timezone.utc).strftime("%B %d, %Y")
    client_name = project.get("client_name", "")
    title = quote.get("title", project.get("title", "Untitled"))
    summary = quote.get("summary", project.get("description", ""))

    pdf = QuotePDF(business_name=business_info.get("business_name", "QuoteGuard"))
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=25)
    pdf.add_page()

    # ── Header ──────────────────────────────────────────────────────
    pdf.set_font("Helvetica", "B", 24)
    pdf.set_text_color(79, 70, 229)  # indigo-600
    pdf.cell(100, 12, pdf.business_name, new_x="RIGHT")

    # Quote meta (right side)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(150, 150, 150)
    x_right = 140
    pdf.set_xy(x_right, 10)
    pdf.cell(60, 4, "QUOTE ID", align="R")
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(30, 30, 46)
    pdf.set_xy(x_right, 14)
    pdf.cell(60, 6, quote_id_short, align="R")

    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(150, 150, 150)
    pdf.set_xy(x_right, 22)
    pdf.cell(60, 4, "DATE", align="R")
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(30, 30, 46)
    pdf.set_xy(x_right, 26)
    pdf.cell(60, 6, issue_date, align="R")

    if client_name:
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(150, 150, 150)
        pdf.set_xy(x_right, 34)
        pdf.cell(60, 4, "CLIENT", align="R")
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(30, 30, 46)
        pdf.set_xy(x_right, 38)
        pdf.cell(60, 6, client_name, align="R")

    # Indigo divider
    pdf.set_y(48)
    pdf.set_draw_color(79, 70, 229)
    pdf.set_line_width(0.8)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(10)

    # ── Title & Summary ──────────────────────────────────────────────
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(30, 30, 46)
    pdf.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    if summary:
        pdf.set_font("Helvetica", "", 11)
        pdf.set_text_color(80, 80, 80)
        pdf.multi_cell(0, 5, summary)
        pdf.ln(6)

    # ── Line Items Table ─────────────────────────────────────────────
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 6, "LINE ITEMS", new_x="LMARGIN", new_y="NEXT")
    pdf.set_draw_color(220, 220, 220)
    pdf.set_line_width(0.3)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(2)

    # Table header
    col_w = [76, 18, 22, 32, 32]
    headers = ["Description", "Qty", "Unit", "Rate", "Total"]
    aligns = ["L", "R", "C", "R", "R"]

    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(130, 130, 130)
    pdf.set_fill_color(248, 249, 250)
    for i, h in enumerate(headers):
        pdf.cell(col_w[i], 8, h, align=aligns[i], fill=True)
    pdf.ln()
    pdf.set_draw_color(220, 220, 220)
    pdf.set_line_width(0.5)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())

    # Table rows
    pdf.set_font("Helvetica", "", 10)
    for item in raw_items:
        pdf.set_text_color(30, 30, 46)
        y_before = pdf.get_y()

        # Description may wrap
        x = pdf.get_x()
        pdf.multi_cell(col_w[0], 6, str(item.get("description", "")), new_x="RIGHT", new_y="TOP", max_line_height=6)
        y_after = pdf.get_y()
        row_h = max(y_after - y_before, 8)
        pdf.set_xy(x + col_w[0], y_before)

        pdf.set_text_color(80, 80, 80)
        pdf.cell(col_w[1], row_h, str(item.get("quantity", "")), align="R")
        pdf.cell(col_w[2], row_h, str(item.get("unit", "")), align="C")
        pdf.cell(col_w[3], row_h, _fmt(item.get("unit_price", 0), symbol), align="R")

        pdf.set_text_color(30, 30, 46)
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(col_w[4], row_h, _fmt(item.get("total", 0), symbol), align="R")
        pdf.set_font("Helvetica", "", 10)
        pdf.ln(row_h)

        # Row divider
        pdf.set_draw_color(240, 240, 240)
        pdf.set_line_width(0.2)
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())

    pdf.ln(4)

    # ── Totals ───────────────────────────────────────────────────────
    totals_x = 130
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(130, 130, 130)
    pdf.set_x(totals_x)
    pdf.cell(38, 7, "Subtotal", align="R")
    pdf.set_text_color(30, 30, 46)
    pdf.cell(32, 7, _fmt(quote.get("subtotal", 0), symbol), align="R")
    pdf.ln()

    if vat_amount > 0:
        pdf.set_text_color(130, 130, 130)
        pdf.set_x(totals_x)
        pdf.cell(38, 7, f"VAT ({vat_rate * 100:.0f}%)", align="R")
        pdf.set_text_color(30, 30, 46)
        pdf.cell(32, 7, _fmt(vat_amount, symbol), align="R")
        pdf.ln()

    # Grand total
    pdf.set_draw_color(79, 70, 229)
    pdf.set_line_width(0.8)
    y = pdf.get_y() + 2
    pdf.line(totals_x, y, 200, y)
    pdf.ln(5)
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(79, 70, 229)
    pdf.set_x(totals_x)
    pdf.cell(38, 8, "Total", align="R")
    pdf.cell(32, 8, _fmt(quote.get("total_amount", 0), symbol), align="R")
    pdf.ln(14)

    # ── Milestones ───────────────────────────────────────────────────
    if sorted_milestones:
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(100, 100, 100)
        pdf.cell(0, 6, "PAYMENT SCHEDULE", new_x="LMARGIN", new_y="NEXT")
        pdf.set_draw_color(220, 220, 220)
        pdf.set_line_width(0.3)
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(4)

        for ms in sorted_milestones:
            y_start = pdf.get_y()
            # Purple left bar
            pdf.set_fill_color(248, 249, 250)
            pdf.rect(10, y_start, 190, 16, "F")
            pdf.set_fill_color(124, 58, 237)
            pdf.rect(10, y_start, 1.2, 16, "F")

            pdf.set_xy(14, y_start + 2)
            pdf.set_font("Helvetica", "B", 10)
            pdf.set_text_color(30, 30, 46)
            seq = ms.get("sequence_number", 0)
            pdf.cell(140, 6, f"{seq}. {ms.get('title', '')}")

            pdf.set_font("Helvetica", "B", 10)
            pdf.set_text_color(124, 58, 237)
            pdf.set_xy(150, y_start + 2)
            pdf.cell(50, 6, _fmt(ms.get("amount_fiat", 0), symbol), align="R")

            if ms.get("description"):
                pdf.set_xy(14, y_start + 9)
                pdf.set_font("Helvetica", "", 8)
                pdf.set_text_color(120, 120, 120)
                pdf.cell(140, 5, ms["description"])

            pdf.set_y(y_start + 18)

    # ── Footer ───────────────────────────────────────────────────────
    pdf.ln(10)
    pdf.set_draw_color(220, 220, 220)
    pdf.set_line_width(0.3)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(4)

    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(180, 180, 180)
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    pdf.cell(0, 4, f"Generated by QuoteGuard on {generated_at}.", new_x="LMARGIN", new_y="NEXT")

    if content_hash:
        pdf.set_font("Courier", "", 7)
        pdf.cell(0, 4, f"Content hash: {content_hash}", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 8)
    pdf.cell(0, 4, "This quote is subject to the terms and conditions agreed between the parties.", new_x="LMARGIN", new_y="NEXT")

    pdf_bytes = pdf.output()
    logger.info("Generated PDF for quote %s (%d bytes)", quote_id, len(pdf_bytes))
    return pdf_bytes


def upload_quote_pdf(
    supabase: Any,
    user_id: str,
    quote_id: str,
    pdf_bytes: bytes,
) -> str:
    """Upload a quote PDF to Supabase Storage."""
    storage_path = f"{user_id}/{quote_id}.pdf"
    bucket = supabase.storage.from_("quote-pdfs")

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
