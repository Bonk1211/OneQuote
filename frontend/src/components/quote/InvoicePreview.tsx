"use client";

import { forwardRef } from "react";
import { formatCurrency } from "@/lib/utils";
import type { LineItem, Milestone } from "@/types/database";

interface InvoicePreviewProps {
  title: string;
  summary: string;
  quoteId: string;
  businessName: string;
  clientName: string;
  currency: string;
  lineItems: LineItem[];
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  milestones: Milestone[];
  createdAt: string;
}

/* ── Style constants matching the reference invoice ────────────────── */
const PURPLE = "#6B4FA0";
const PURPLE_LIGHT = "#E8DEF8";
const DARK = "#1a1a2e";
const GRAY = "#555";
const LIGHT_GRAY = "#999";

/**
 * A4-sized invoice (794 × 1123px at 96dpi).
 * Matches real-world invoice format: heading, meta, billed-by/to,
 * line-items table with purple header, totals, terms, footer.
 */
export const InvoicePreview = forwardRef<HTMLDivElement, InvoicePreviewProps>(
  function InvoicePreview(
    {
      title,
      summary,
      quoteId,
      businessName,
      clientName,
      currency,
      lineItems,
      subtotal,
      vatAmount,
      totalAmount,
      milestones,
      createdAt,
    },
    ref
  ) {
    const sortedMs = [...milestones].sort(
      (a, b) => a.sequence_number - b.sequence_number
    );

    const issueDate = new Date(createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const dueDate = new Date(
      new Date(createdAt).getTime() + 14 * 24 * 60 * 60 * 1000
    ).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const quoteNo = `Q-${quoteId.slice(0, 6).toUpperCase()}`;
    const biz = businessName || "OneQuote";

    const termsText = [
      "1. A 50% deposit is required before work begins. The remaining balance is due upon project completion.",
      "2. Payment is due within 14 days of the invoice date. Late payments may incur additional charges.",
      "3. Up to two minor revisions are included. Additional revisions may incur extra charges.",
      "4. All deliverables remain the property of the provider until full payment is received.",
      "5. Either party may cancel with written notice. Work completed up to cancellation will be billed accordingly.",
    ];

    return (
      <div
        ref={ref}
        style={{
          width: "794px",
          minHeight: "1123px",
          background: "#fff",
          color: DARK,
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          fontSize: "13px",
          lineHeight: "1.55",
          padding: "56px 60px 48px",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* ── Header: "Invoice" title + meta ─────────────────────────── */}
        <div style={{ marginBottom: "32px" }}>
          <div
            style={{
              fontSize: "38px",
              fontWeight: 700,
              color: PURPLE,
              letterSpacing: "-0.5px",
              marginBottom: "20px",
            }}
          >
            Invoice
          </div>

          <table style={{ fontSize: "13px", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ color: LIGHT_GRAY, padding: "3px 24px 3px 0", whiteSpace: "nowrap" }}>
                  Invoice No #
                </td>
                <td style={{ fontWeight: 700, padding: "3px 0" }}>{quoteNo}</td>
              </tr>
              <tr>
                <td style={{ color: LIGHT_GRAY, padding: "3px 24px 3px 0" }}>
                  Invoice Date
                </td>
                <td style={{ fontWeight: 700, padding: "3px 0" }}>{issueDate}</td>
              </tr>
              <tr>
                <td style={{ color: LIGHT_GRAY, padding: "3px 24px 3px 0" }}>
                  Due Date
                </td>
                <td style={{ fontWeight: 700, padding: "3px 0" }}>{dueDate}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Billed By / Billed To ──────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginBottom: "36px",
          }}
        >
          {/* Billed By */}
          <div
            style={{
              flex: 1,
              border: "1px solid #e0d8ec",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: PURPLE_LIGHT,
                padding: "10px 16px",
                fontWeight: 700,
                fontSize: "14px",
                color: DARK,
              }}
            >
              Billed By
            </div>
            <div style={{ padding: "14px 16px", fontSize: "12px", color: GRAY, lineHeight: "1.7" }}>
              <div style={{ fontWeight: 700, fontSize: "13px", color: DARK, marginBottom: "4px" }}>
                {biz}
              </div>
              <div>Powered by OneQuote</div>
            </div>
          </div>

          {/* Billed To */}
          <div
            style={{
              flex: 1,
              border: "1px solid #e0d8ec",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: PURPLE_LIGHT,
                padding: "10px 16px",
                fontWeight: 700,
                fontSize: "14px",
                color: DARK,
              }}
            >
              Billed To
            </div>
            <div style={{ padding: "14px 16px", fontSize: "12px", color: GRAY, lineHeight: "1.7" }}>
              <div style={{ fontWeight: 700, fontSize: "13px", color: DARK, marginBottom: "4px" }}>
                {clientName || "—"}
              </div>
            </div>
          </div>
        </div>

        {/* ── Project Summary ────────────────────────────────────────── */}
        {summary && (
          <div style={{ marginBottom: "24px" }}>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: LIGHT_GRAY,
                marginBottom: "6px",
              }}
            >
              Project
            </div>
            <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>
              {title}
            </div>
            <div style={{ fontSize: "12px", color: GRAY, lineHeight: "1.6" }}>
              {summary}
            </div>
          </div>
        )}

        {/* ── Line Items Table ───────────────────────────────────────── */}
        <div
          style={{
            border: "1px solid #e0d8ec",
            borderRadius: "8px",
            overflow: "hidden",
            marginBottom: "20px",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: PURPLE_LIGHT }}>
                <th
                  style={{
                    padding: "11px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: DARK,
                    width: "46%",
                  }}
                >
                  Item
                </th>
                <th
                  style={{
                    padding: "11px 16px",
                    textAlign: "center",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: DARK,
                  }}
                >
                  Quantity
                </th>
                <th
                  style={{
                    padding: "11px 16px",
                    textAlign: "right",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: DARK,
                  }}
                >
                  Rate
                </th>
                <th
                  style={{
                    padding: "11px 16px",
                    textAlign: "right",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: DARK,
                  }}
                >
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, i) => (
                <tr
                  key={i}
                  style={{
                    borderTop: "1px solid #f0ecf5",
                  }}
                >
                  <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                    <div style={{ fontWeight: 700, fontSize: "13px", color: DARK }}>
                      {i + 1}. {item.description}
                    </div>
                    <div style={{ fontSize: "11px", color: LIGHT_GRAY, marginTop: "2px" }}>
                      {item.unit}
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      textAlign: "center",
                      color: GRAY,
                      verticalAlign: "top",
                    }}
                  >
                    {item.quantity}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      textAlign: "right",
                      color: GRAY,
                      verticalAlign: "top",
                    }}
                  >
                    {formatCurrency(item.unit_price, currency)}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      textAlign: "right",
                      fontWeight: 600,
                      color: DARK,
                      verticalAlign: "top",
                    }}
                  >
                    {formatCurrency(item.total, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Totals (right-aligned, double-line style) ──────────────── */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "36px" }}>
          <div style={{ width: "280px" }}>
            {vatAmount > 0 && (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    fontSize: "13px",
                    color: GRAY,
                  }}
                >
                  <span>Subtotal</span>
                  <span style={{ color: DARK }}>{formatCurrency(subtotal, currency)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    fontSize: "13px",
                    color: GRAY,
                  }}
                >
                  <span>VAT</span>
                  <span style={{ color: DARK }}>{formatCurrency(vatAmount, currency)}</span>
                </div>
              </>
            )}
            {/* Double-line separator */}
            <div
              style={{
                borderTop: `2px solid ${DARK}`,
                borderBottom: `2px solid ${DARK}`,
                height: "6px",
                marginTop: "8px",
                marginBottom: "8px",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "15px",
                fontWeight: 700,
                color: DARK,
                padding: "2px 0",
              }}
            >
              <span>Total ({currency})</span>
              <span>{formatCurrency(totalAmount, currency)}</span>
            </div>
          </div>
        </div>

        {/* ── Terms and Conditions / Payment Schedule ────────────────── */}
        <div style={{ marginBottom: "36px" }}>
          <div
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: PURPLE,
              marginBottom: "12px",
            }}
          >
            Terms and Conditions
          </div>
          <div style={{ fontSize: "12px", color: GRAY, lineHeight: "1.8" }}>
            {termsText.map((t, i) => (
              <div key={i} style={{ marginBottom: "6px" }}>
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* ── Spacer to push footer down ─────────────────────────────── */}
        <div style={{ flex: 1 }} />

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div
          style={{
            textAlign: "center",
            fontSize: "11px",
            color: LIGHT_GRAY,
            borderTop: "1px solid #e5e7eb",
            paddingTop: "16px",
          }}
        >
          Generated by OneQuote &middot; {issueDate}
        </div>
      </div>
    );
  }
);
