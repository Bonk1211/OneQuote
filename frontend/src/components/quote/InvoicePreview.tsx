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

/**
 * A4-sized invoice preview (794px × 1123px at 96dpi).
 * Renders as a white page with proper margins for print fidelity.
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
      month: "long",
      day: "numeric",
    });

    return (
      <div
        ref={ref}
        className="bg-white text-zinc-900"
        style={{
          width: "794px",
          minHeight: "1123px",
          padding: "72px 64px",
          fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
          fontSize: "13px",
          lineHeight: "1.5",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: "3px solid #4F46E5",
            paddingBottom: "20px",
            marginBottom: "32px",
          }}
        >
          <div>
            <div style={{ fontSize: "26px", fontWeight: 700, color: "#4F46E5" }}>
              {businessName || "QuoteGuard"}
            </div>
            <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
              Professional Quote
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "#999" }}>
                Quote ID
              </div>
              <div style={{ fontSize: "14px", fontWeight: 600 }}>
                {quoteId.slice(0, 8).toUpperCase()}
              </div>
            </div>
            <div style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "#999" }}>
                Date
              </div>
              <div style={{ fontSize: "14px", fontWeight: 600 }}>{issueDate}</div>
            </div>
            {clientName && (
              <div>
                <div style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "#999" }}>
                  Client
                </div>
                <div style={{ fontSize: "14px", fontWeight: 600 }}>{clientName}</div>
              </div>
            )}
          </div>
        </div>

        {/* Title & Summary */}
        <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px" }}>
          {title}
        </div>
        {summary && (
          <div style={{ fontSize: "13px", color: "#555", marginBottom: "28px", lineHeight: "1.6" }}>
            {summary}
          </div>
        )}

        {/* Line Items */}
        <div
          style={{
            fontSize: "11px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: "#666",
            borderBottom: "1px solid #e5e7eb",
            paddingBottom: "8px",
            marginBottom: "4px",
          }}
        >
          Line Items
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ padding: "10px 0", textAlign: "left", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", color: "#888", width: "42%" }}>
                Description
              </th>
              <th style={{ padding: "10px 0", textAlign: "right", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", color: "#888" }}>
                Qty
              </th>
              <th style={{ padding: "10px 0", textAlign: "center", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", color: "#888" }}>
                Unit
              </th>
              <th style={{ padding: "10px 0", textAlign: "right", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", color: "#888" }}>
                Rate
              </th>
              <th style={{ padding: "10px 0", textAlign: "right", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", color: "#888" }}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: "10px 0", color: "#1a1a2e" }}>{item.description}</td>
                <td style={{ padding: "10px 0", textAlign: "right", color: "#555" }}>{item.quantity}</td>
                <td style={{ padding: "10px 0", textAlign: "center", color: "#555" }}>{item.unit}</td>
                <td style={{ padding: "10px 0", textAlign: "right", color: "#555" }}>
                  {formatCurrency(item.unit_price, currency)}
                </td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600, color: "#1a1a2e" }}>
                  {formatCurrency(item.total, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ marginLeft: "auto", width: "260px", marginBottom: "36px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "13px" }}>
            <span style={{ color: "#888" }}>Subtotal</span>
            <span style={{ color: "#1a1a2e" }}>{formatCurrency(subtotal, currency)}</span>
          </div>
          {vatAmount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "13px" }}>
              <span style={{ color: "#888" }}>VAT</span>
              <span style={{ color: "#1a1a2e" }}>{formatCurrency(vatAmount, currency)}</span>
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderTop: "3px solid #4F46E5",
              marginTop: "8px",
              paddingTop: "10px",
              fontSize: "16px",
              fontWeight: 700,
              color: "#4F46E5",
            }}
          >
            <span>Total</span>
            <span>{formatCurrency(totalAmount, currency)}</span>
          </div>
        </div>

        {/* Milestones */}
        {sortedMs.length > 0 && (
          <>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "#666",
                borderBottom: "1px solid #e5e7eb",
                paddingBottom: "8px",
                marginBottom: "12px",
              }}
            >
              Payment Schedule
            </div>
            <div style={{ marginBottom: "36px" }}>
              {sortedMs.map((ms, i) => (
                <div
                  key={ms.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "#f8f9fa",
                    borderLeft: "3px solid #7C3AED",
                    padding: "12px 16px",
                    marginBottom: "8px",
                    borderRadius: "0 6px 6px 0",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a2e" }}>
                      {i + 1}. {ms.title}
                    </div>
                    {ms.description && (
                      <div style={{ fontSize: "11px", color: "#777", marginTop: "2px" }}>
                        {ms.description}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#7C3AED" }}>
                    {formatCurrency(ms.amount_fiat, currency)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Footer */}
        <div
          style={{
            borderTop: "1px solid #e5e7eb",
            paddingTop: "16px",
            marginTop: "auto",
          }}
        >
          <div style={{ fontSize: "10px", color: "#bbb" }}>
            Generated by QuoteGuard on {issueDate}.
          </div>
          <div style={{ fontSize: "10px", color: "#bbb", marginTop: "4px" }}>
            This quote is subject to the terms and conditions agreed between the parties.
          </div>
        </div>
      </div>
    );
  }
);
