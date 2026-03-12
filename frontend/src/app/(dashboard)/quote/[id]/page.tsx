"use client";

import { useParams } from "next/navigation";
import { Download, Send, Shield } from "lucide-react";
import { useQuote } from "@/hooks/useQuote";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { EscrowStatusBadge } from "@/components/escrow/EscrowStatusBadge";
import type { ProjectStatus } from "@/types/database";

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: quoteData, isLoading } = useQuote(id);

  if (isLoading || !quoteData) {
    return <div className="p-6 text-zinc-500">Loading...</div>;
  }

  const quote = quoteData;
  const project = quote.projects;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{quote.title}</h1>
          <p className="mt-1 text-sm text-zinc-400">{quote.summary}</p>
        </div>
        {project && <EscrowStatusBadge status={project.status as ProjectStatus} type="project" />}
      </div>

      {/* Profitability bar */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500">Total</p>
          <p className="text-lg font-bold">{formatCurrency(quote.total_amount, quote.currency_code)}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500">Break-even</p>
          <p className="text-lg font-bold">
            {quote.break_even_amount != null ? formatCurrency(quote.break_even_amount, quote.currency_code) : "-"}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500">Profit Margin</p>
          <p className={`text-lg font-bold ${quote.is_profitable ? "text-green-400" : "text-red-400"}`}>
            {quote.profit_margin_percent != null ? formatPercent(quote.profit_margin_percent) : "-"}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500">Min Day Rate</p>
          <p className="text-lg font-bold">
            {quote.min_daily_rate != null ? formatCurrency(quote.min_daily_rate, quote.currency_code) : "-"}
          </p>
        </div>
      </div>

      {/* Line items */}
      <div className="mb-6 overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900">
            <tr>
              <th className="px-4 py-3 text-left text-zinc-400">Description</th>
              <th className="px-4 py-3 text-right text-zinc-400">Qty</th>
              <th className="px-4 py-3 text-right text-zinc-400">Rate</th>
              <th className="px-4 py-3 text-right text-zinc-400">Total</th>
            </tr>
          </thead>
          <tbody>
            {quote.line_items.map((item, i) => (
              <tr key={i} className="border-t border-zinc-800">
                <td className="px-4 py-3 text-white">{item.description}</td>
                <td className="px-4 py-3 text-right text-zinc-300">
                  {item.quantity} {item.unit}
                </td>
                <td className="px-4 py-3 text-right text-zinc-300">
                  {formatCurrency(item.unit_price, quote.currency_code)}
                </td>
                <td className="px-4 py-3 text-right font-medium text-white">
                  {formatCurrency(item.total, quote.currency_code)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
          <Shield className="h-4 w-4" />
          Create Escrow
        </button>
        <button className="flex items-center gap-2 rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800">
          <Send className="h-4 w-4" />
          Send to Client
        </button>
        <button className="flex items-center gap-2 rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800">
          <Download className="h-4 w-4" />
          Download PDF
        </button>
      </div>
    </div>
  );
}
