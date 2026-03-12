"use client";

import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { ParsedQuoteResponse, ProfitAnalysisResponse } from "@/types/quote";

interface Props {
  quote: ParsedQuoteResponse;
  analysis: ProfitAnalysisResponse;
  onAccept: () => void;
}

export function QuoteSuggestion({ quote, analysis, onAccept }: Props) {
  const profitColor = analysis.is_profitable
    ? analysis.profit_margin_percent >= 20
      ? "text-green-400"
      : "text-yellow-400"
    : "text-red-400";

  const ProfitIcon = analysis.is_profitable
    ? analysis.profit_margin_percent >= 20
      ? CheckCircle2
      : AlertTriangle
    : XCircle;

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">{quote.title}</h3>
          <p className="mt-1 text-sm text-zinc-400">{quote.summary}</p>
        </div>
        <div className={`flex items-center gap-1.5 ${profitColor}`}>
          <ProfitIcon className="h-5 w-5" />
          <span className="text-sm font-medium">
            {formatPercent(analysis.profit_margin_percent)} margin
          </span>
        </div>
      </div>

      {/* Line items */}
      <div className="mb-4 overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-800/50">
            <tr>
              <th className="px-3 py-2 text-left text-zinc-400">Item</th>
              <th className="px-3 py-2 text-right text-zinc-400">Qty</th>
              <th className="px-3 py-2 text-right text-zinc-400">Rate</th>
              <th className="px-3 py-2 text-right text-zinc-400">Total</th>
            </tr>
          </thead>
          <tbody>
            {quote.line_items.map((item, i) => (
              <tr key={i} className="border-t border-zinc-800">
                <td className="px-3 py-2 text-zinc-200">{item.description}</td>
                <td className="px-3 py-2 text-right text-zinc-300">
                  {item.quantity} {item.unit}
                </td>
                <td className="px-3 py-2 text-right text-zinc-300">
                  {formatCurrency(item.unit_price)}
                </td>
                <td className="px-3 py-2 text-right font-medium text-white">
                  {formatCurrency(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-zinc-700 bg-zinc-800/30">
            <tr>
              <td colSpan={3} className="px-3 py-2 text-right font-medium text-white">
                Total
              </td>
              <td className="px-3 py-2 text-right font-bold text-white">
                {formatCurrency(quote.total_amount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Profitability summary */}
      <div className="mb-4 grid grid-cols-3 gap-3">
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

      {/* Warnings */}
      {analysis.warnings.length > 0 && (
        <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
          {analysis.warnings.map((w, i) => (
            <p key={i} className="text-sm text-yellow-300">
              {w}
            </p>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onAccept}
          className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          Accept Quote
        </button>
        <button className="flex-1 rounded-lg border border-zinc-700 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800">
          Refine
        </button>
      </div>
    </div>
  );
}
