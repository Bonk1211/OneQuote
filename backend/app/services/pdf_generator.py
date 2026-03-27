"""
PDF generation service for OneQuote quotes.

Uses fpdf2 for PDF rendering — pure Python, no system dependencies.
Matches the frontend InvoicePreview layout: large "Invoice" heading,
meta table, billed-by/to boxes, purple-header item table, double-line
totals, terms section, and centered footer.
"""

from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from fpdf import FPDF

logger = logging.getLogger(__name__)

# ── Palette ──────────────────────────────────────────────────────────
PURPLE = (107, 79, 160)
PURPLE_LIGHT = (232, 222, 248)
DARK = (26, 26, 46)
GRAY = (85, 85, 85)
LIGHT_GRAY = (153, 153, 153)
WHITE = (255, 255, 255)
BORDER_LIGHT = (224, 216, 236)

CURRENCY_SYMBOLS: dict[str, str] = {
    "GBP": "\u00a3", "USD": "$", "EUR": "\u20ac", "SGD": "S$", "AUD": "A$",
}


def _sym(code: str) -> str:
    return CURRENCY_SYMBOLS.get(code, code)


def _fmt(amount_minor: int, code: str) -> str:
    return f"{_sym(code)}{amount_minor / 100:,.2f}"


# ── PDF Class ────────────────────────────────────────────────────────

class QuotePDF(FPDF):
    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(*LIGHT_GRAY)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")


# ── Public API ───────────────────────────────────────────────────────

def generate_quote_pdf(
    quote: dict[str, Any],
    project: dict[str, Any],
    milestones: list[dict[str, Any]],
    business_info: dict[str, Any],
) -> bytes:
    cc = business_info.get("currency_code", quote.get("currency_code", "USD"))
    vat_amount = quote.get("vat_amount", 0)

    content_hash = quote.get("content_hash", "")
    if not content_hash:
        content_hash = hashlib.sha256(
            json.dumps(quote, sort_keys=True, default=str).encode()
        ).hexdigest()

    raw_items = quote.get("line_items", [])
    if isinstance(raw_items, str):
        raw_items = json.loads(raw_items)

    sorted_ms = sorted(milestones, key=lambda m: m.get("sequence_number", 0))
    quote_id = str(quote.get("id", ""))
    quote_no = f"Q-{quote_id[:6].upper()}" if len(quote_id) >= 6 else quote_id.upper()
    issue_dt = datetime.now(timezone.utc)
    issue_date = issue_dt.strftime("%b %d, %Y")
    due_date = (issue_dt + timedelta(days=14)).strftime("%b %d, %Y")
    client_name = project.get("client_name", "")
    title = quote.get("title", project.get("title", "Untitled"))
    summary = quote.get("summary", project.get("description", ""))
    biz = business_info.get("business_name", "") or "OneQuote"
    total_amount = quote.get("total_amount", 0)

    pdf = QuotePDF()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=25)
    pdf.add_page()

    # ── 1. "Invoice" heading ─────────────────────────────────────────
    pdf.set_font("Helvetica", "B", 32)
    pdf.set_text_color(*PURPLE)
    pdf.cell(0, 14, "Invoice", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(8)

    # ── 2. Meta table ────────────────────────────────────────────────
    pdf.set_font("Helvetica", "", 11)
    for label, value in [("Invoice No #", quote_no), ("Invoice Date", issue_date), ("Due Date", due_date)]:
        pdf.set_text_color(*LIGHT_GRAY)
        pdf.cell(35, 7, label)
        pdf.set_text_color(*DARK)
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(60, 7, value, new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 11)
    pdf.ln(8)

    # ── 3. Billed By / Billed To ────────────────────────────────────
    box_w = 88
    box_x1 = 10
    box_x2 = 104
    header_h = 9
    body_h = 28
    y_start = pdf.get_y()

    for bx, heading, line1, line2 in [
        (box_x1, "Billed By", biz, "Powered by OneQuote"),
        (box_x2, "Billed To", client_name or "\u2014", ""),
    ]:
        # Header
        pdf.set_fill_color(*PURPLE_LIGHT)
        pdf.set_draw_color(*BORDER_LIGHT)
        pdf.set_xy(bx, y_start)
        pdf.rect(bx, y_start, box_w, header_h + body_h, "D")
        pdf.rect(bx, y_start, box_w, header_h, "F")
        pdf.set_xy(bx + 5, y_start + 1)
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(*DARK)
        pdf.cell(box_w - 10, header_h - 2, heading)

        # Body
        pdf.set_xy(bx + 5, y_start + header_h + 3)
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(box_w - 10, 6, line1, new_x="LEFT", new_y="NEXT")
        if line2:
            pdf.set_xy(bx + 5, pdf.get_y())
            pdf.set_font("Helvetica", "", 9)
            pdf.set_text_color(*GRAY)
            pdf.cell(box_w - 10, 5, line2)

    pdf.set_y(y_start + header_h + body_h + 8)

    # ── 4. Project summary ───────────────────────────────────────────
    if summary:
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(*LIGHT_GRAY)
        pdf.cell(0, 4, "PROJECT", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(1)
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(*DARK)
        pdf.cell(0, 6, title, new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(*GRAY)
        pdf.multi_cell(0, 5, summary)
        pdf.ln(6)

    # ── 5. Line items table ──────────────────────────────────────────
    col_w = [82, 26, 36, 36]
    headers = ["Item", "Quantity", "Rate", "Amount"]
    aligns = ["L", "C", "R", "R"]

    tbl_x = 10
    tbl_w = sum(col_w)

    # Draw outer border
    y_tbl_start = pdf.get_y()
    pdf.set_draw_color(*BORDER_LIGHT)

    # Header row
    pdf.set_fill_color(*PURPLE_LIGHT)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(*DARK)
    pdf.set_x(tbl_x)
    for i, h in enumerate(headers):
        pdf.cell(col_w[i], 10, h, align=aligns[i], fill=True, border=0)
    pdf.ln()

    # Rows
    pdf.set_draw_color(240, 236, 245)
    for idx, item in enumerate(raw_items):
        pdf.set_x(tbl_x)
        y0 = pdf.get_y()
        pdf.set_line_width(0.2)
        if idx > 0:
            pdf.line(tbl_x, y0, tbl_x + tbl_w, y0)

        # Item cell (multi-line)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*DARK)
        desc = f"{idx + 1}. {item.get('description', '')}"
        pdf.multi_cell(col_w[0], 6, desc, new_x="RIGHT", new_y="TOP", max_line_height=6)
        row_bottom = pdf.get_y()

        # Unit label below description
        pdf.set_xy(tbl_x, row_bottom)
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(*LIGHT_GRAY)
        pdf.cell(col_w[0], 5, item.get("unit", ""))
        row_bottom = pdf.get_y() + 5

        row_h = row_bottom - y0

        # Qty, Rate, Amount
        pdf.set_xy(tbl_x + col_w[0], y0)
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(*GRAY)
        pdf.cell(col_w[1], row_h, str(item.get("quantity", "")), align="C")
        pdf.cell(col_w[2], row_h, _fmt(item.get("unit_price", 0), cc), align="R")

        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*DARK)
        pdf.cell(col_w[3], row_h, _fmt(item.get("total", 0), cc), align="R")
        pdf.set_y(row_bottom + 2)

    # Table border
    y_tbl_end = pdf.get_y()
    pdf.set_draw_color(*BORDER_LIGHT)
    pdf.set_line_width(0.4)
    pdf.rect(tbl_x, y_tbl_start, tbl_w, y_tbl_end - y_tbl_start)
    pdf.ln(6)

    # ── 6. Totals (right-aligned, double-line) ───────────────────────
    totals_x = 120
    if vat_amount > 0:
        pdf.set_font("Helvetica", "", 11)
        pdf.set_text_color(*GRAY)
        pdf.set_x(totals_x)
        pdf.cell(38, 7, "Subtotal", align="R")
        pdf.set_text_color(*DARK)
        pdf.cell(32, 7, _fmt(quote.get("subtotal", 0), cc), align="R")
        pdf.ln()

        pdf.set_text_color(*GRAY)
        pdf.set_x(totals_x)
        pdf.cell(38, 7, "VAT", align="R")
        pdf.set_text_color(*DARK)
        pdf.cell(32, 7, _fmt(vat_amount, cc), align="R")
        pdf.ln()

    # Double line
    y = pdf.get_y() + 2
    pdf.set_draw_color(*DARK)
    pdf.set_line_width(0.6)
    pdf.line(totals_x, y, 200, y)
    pdf.line(totals_x, y + 3, 200, y + 3)
    pdf.ln(8)

    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(*DARK)
    pdf.set_x(totals_x)
    pdf.cell(38, 8, f"Total ({cc})", align="R")
    pdf.cell(32, 8, _fmt(total_amount, cc), align="R")
    pdf.ln(14)

    # ── 7. Terms and Conditions ────────────────────────────────────────
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(*PURPLE)
    pdf.cell(0, 8, "Terms and Conditions", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*GRAY)

    terms = [
        "1. A 50% deposit is required before work begins. The remaining balance is due upon project completion.",
        "2. Payment is due within 14 days of the invoice date. Late payments may incur additional charges.",
        "3. Up to two minor revisions are included. Additional revisions may incur extra charges.",
        "4. All deliverables remain the property of the provider until full payment is received.",
        "5. Either party may cancel with written notice. Work completed up to cancellation will be billed accordingly.",
    ]
    for line in terms:
        pdf.multi_cell(0, 5.5, line)
        pdf.ln(1)

    # ── 8. Footer ────────────────────────────────────────────────────
    pdf.ln(10)
    pdf.set_draw_color(220, 220, 220)
    pdf.set_line_width(0.3)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(4)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*LIGHT_GRAY)
    pdf.cell(0, 5, f"Generated by OneQuote \u00b7 {issue_date}", align="C")

    result = pdf.output()
    logger.info("Generated PDF for quote %s (%d bytes)", quote_id, len(result))
    return result


def upload_quote_pdf(
    supabase: Any,
    user_id: str,
    quote_id: str,
    pdf_bytes: bytes,
) -> str:
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
