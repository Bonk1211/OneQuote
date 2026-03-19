"use client";

import { useState, useMemo } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import { QuoteLineItem } from "./QuoteLineItem";
import type { ParsedQuoteResponse, ProfitAnalysisResponse } from "@/types/quote";

interface Props {
  quote: ParsedQuoteResponse;
  analysis: ProfitAnalysisResponse;
  onAccept: () => void;
}

export function QuoteSuggestion({ quote, analysis, onAccept }: Props) {
  // ── Checkable line items ──────────────────────────────────────────
  const [checkedItems, setCheckedItems] = useState<boolean[]>(
    () => quote.line_items.map(() => true)
  );
  const [editedItems, setEditedItems] = useState(
    () => quote.line_items.map((li) => ({ ...li }))
  );
  const [showMilestones, setShowMilestones] = useState(true);
  const [checkedMilestones, setCheckedMilestones] = useState<boolean[]>(
    () => quote.milestones.map(() => true)
  );

  // Toggle a line item on/off
  const toggleItem = (index: number) => {
    setCheckedItems((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  // Update a line item field (quantity or unit_price)
  const updateItem = (index: number, field: "quantity" | "unit_price", value: number) => {
    setEditedItems((prev) => {
      const next = [...prev];
      const item = { ...next[index] };
      item[field] = value;
      item.total = Math.round(item.quantity * item.unit_price);
      next[index] = item;
      return next;
    });
  };

  // Toggle milestone
  const toggleMilestone = (index: number) => {
    setCheckedMilestones((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  // ── Recalculated totals ───────────────────────────────────────────
  const liveSubtotal = useMemo(
    () =>
      editedItems.reduce(
        (sum, item, i) => (checkedItems[i] ? sum + item.total : sum),
        0
      ),
    [editedItems, checkedItems]
  );

  const liveVat = useMemo(() => {
    if (quote.vat_amount === 0) return 0;
    // Maintain the same VAT ratio as the original quote
    const vatRatio = quote.subtotal > 0 ? quote.vat_amount / quote.subtotal : 0;
    return Math.round(liveSubtotal * vatRatio);
  }, [liveSubtotal, quote.vat_amount, quote.subtotal]);

  const liveTotal = liveSubtotal + liveVat;
  const hasChanges = liveTotal !== quote.total_amount;

  // ── Profitability colors ──────────────────────────────────────────
  const profitColor = analysis.is_profitable
    ? analysis.profit_margin_percent >= 20
      ? "text-green-400"
      : "text-yellow-400"
    : "text-red-400";

  const profitBgColor = analysis.is_profitable
    ? analysis.profit_margin_percent >= 20
      ? "bg-green-500"
      : "bg-yellow-500"
    : "bg-red-500";

  const ProfitIcon = analysis.is_profitable
    ? analysis.profit_margin_percent >= 20
      ? CheckCircle2
      : AlertTriangle
    : XCircle;

  const marginClamped = Math.min(Math.max(analysis.profit_margin_percent, 0), 100);

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 space-y-4">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">{quote.title}</h3>
          <p className="mt-1 text-sm text-zinc-400">{quote.summary}</p>
          <span className="mt-2 inline-block rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400">
            {quote.duration_days} day{quote.duration_days !== 1 ? "s" : ""}
          </span>
        </div>
        <div className={`flex items-center gap-1.5 ${profitColor}`}>
          <ProfitIcon className="h-5 w-5" />
          <span className="text-sm font-medium">
            {formatPercent(analysis.profit_margin_percent)} margin
          </span>
        </div>
      </div>

      {/* ── Profit margin bar ──────────────────────────────────────── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>Profit margin</span>
          <span className={profitColor}>{formatPercent(analysis.profit_margin_percent)}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className={cn("h-full rounded-full transition-all duration-500", profitBgColor)}
            style={{ width: `${marginClamped}%` }}
          />
        </div>
      </div>

      {/* ── Checkable line items ───────────────────────────────────── */}
      <div className="overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-800/50">
            <tr>
              <th className="w-10 px-3 py-2" />
              <th className="px-3 py-2 text-left text-zinc-400">Item</th>
              <th className="px-3 py-2 text-right text-zinc-400">Qty</th>
              <th className="px-3 py-2 text-right text-zinc-400">Rate</th>
              <th className="px-3 py-2 text-right text-zinc-400">Total</th>
            </tr>
          </thead>
          <tbody>
            {editedItems.map((item, i) => (
              <QuoteLineItem
                key={i}
                item={item}
                index={i}
                checked={checkedItems[i]}
                onToggle={toggleItem}
                onUpdate={updateItem}
              />
            ))}
          </tbody>
          <tfoot className="border-t border-zinc-700 bg-zinc-800/30">
            {liveVat > 0 && (
              <tr className="border-b border-zinc-800">
                <td />
                <td colSpan={3} className="px-3 py-2 text-right text-sm text-zinc-400">
                  VAT
                </td>
                <td className="px-3 py-2 text-right text-sm text-zinc-300">
                  {formatCurrency(liveVat)}
                </td>
              </tr>
            )}
            <tr>
              <td />
              <td colSpan={3} className="px-3 py-2 text-right font-medium text-white">
                Total
                {hasChanges && (
                  <span className="ml-2 text-xs text-indigo-400">(adjusted)</span>
                )}
              </td>
              <td className="px-3 py-2 text-right font-bold text-white">
                {formatCurrency(liveTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Profitability summary cards ────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-zinc-800 p-3">
          <p className="text-xs text-zinc-500">Break-even</p>
          <p className="text-sm font-medium text-white">
            {formatCurrency(analysis.break_even_amount)}
          </p>
        </div>
        <div className="rounded-lg bg-zinc-800 p-3">
          <p className="text-xs text-zinc-500">Min Daily Rate</p>
          <p className="text-sm font-medium text-white">
            {formatCurrency(analysis.min_daily_rate)}
          </p>
        </div>
        <div className="rounded-lg bg-zinc-800 p-3">
          <p className="text-xs text-zinc-500">Profit</p>
          <p className={`text-sm font-medium ${profitColor}`}>
            {formatCurrency(analysis.profit_amount)}
          </p>
        </div>
      </div>

      {/* ── Warnings ───────────────────────────────────────────────── */}
      {analysis.warnings.length > 0 && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
          {analysis.warnings.map((w, i) => (
            <p key={i} className="text-sm text-yellow-300">
              ⚠️ {w}
            </p>
          ))}
        </div>
      )}

      {/* ── Checkable milestones ───────────────────────────────────── */}
      {quote.milestones.length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-800/30">
          <button
            onClick={() => setShowMilestones((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
          >
            <span>Payment Milestones ({quote.milestones.length})</span>
            {showMilestones ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {showMilestones && (
            <div className="space-y-2 px-4 pb-4">
              {quote.milestones.map((ms, i) => {
                const msAmount = Math.round(
                  liveSubtotal * (ms.percentage ?? 0) / 100
                );
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-3 rounded-lg bg-zinc-900 px-3 py-2.5 transition-all duration-200",
                      !checkedMilestones[i] && "opacity-40"
                    )}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleMilestone(i)}
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                        checkedMilestones[i]
                          ? "border-indigo-500 bg-indigo-600 text-white"
                          : "border-zinc-600 bg-zinc-800 text-transparent hover:border-zinc-500"
                      )}
                    >
                      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M2.5 6L5 8.5L9.5 3.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    {/* Number badge */}
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-medium text-zinc-300">
                      {i + 1}
                    </span>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm font-medium transition-all",
                          checkedMilestones[i] ? "text-white" : "text-zinc-500 line-through"
                        )}
                      >
                        {ms.title}
                      </p>
                      {ms.description && (
                        <p className="text-xs text-zinc-500 truncate">
                          {ms.description}
                        </p>
                      )}
                    </div>

                    {/* Amount & percentage */}
                    <div className="text-right shrink-0">
                      <p
                        className={cn(
                          "text-sm font-medium transition-all",
                          checkedMilestones[i] ? "text-white" : "text-zinc-500 line-through"
                        )}
                      >
                        {formatCurrency(msAmount)}
                      </p>
                      <p className="text-xs text-zinc-500">{ms.percentage}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Actions ────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <button
          onClick={onAccept}
          className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 active:scale-[0.98]"
        >
          Accept Quote
        </button>
        <button className="flex-1 rounded-lg border border-zinc-700 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 active:scale-[0.98]">
          Refine
        </button>
      </div>
    </div>
  );
}
