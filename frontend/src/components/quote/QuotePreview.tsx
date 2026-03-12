import {
  FileText,
  Clock,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { LineItemTable } from "./LineItemTable";
import type { Quote, Milestone } from "@/types/database";

interface QuotePreviewProps {
  /** The quote to preview */
  quote: Quote;
  /** Associated milestones (if available) */
  milestones?: Milestone[];
}

/**
 * Styled quote preview card showing title, summary, profitability metrics,
 * line items table, and milestones list. Used on the quote/[id] detail page.
 */
export function QuotePreview({ quote, milestones = [] }: QuotePreviewProps) {
  const isProfitable = quote.is_profitable ?? true;
  const marginColor = isProfitable
    ? (quote.profit_margin_percent ?? 0) >= 20
      ? "text-green-400"
      : "text-yellow-400"
    : "text-red-400";

  const marginVariant = isProfitable
    ? (quote.profit_margin_percent ?? 0) >= 20
      ? "success"
      : "warning"
    : "danger";

  const sortedMilestones = [...milestones].sort(
    (a, b) => a.sequence_number - b.sequence_number
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 shrink-0 text-indigo-400" />
              <h2 className="truncate text-lg font-semibold text-white">
                {quote.title}
              </h2>
            </div>
            {quote.summary && (
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {quote.summary}
              </p>
            )}
          </div>
          <Badge variant={marginVariant}>
            {quote.profit_margin_percent != null
              ? `${formatPercent(quote.profit_margin_percent)} margin`
              : "N/A"}
          </Badge>
        </CardHeader>

        {/* Profitability metrics */}
        <CardBody>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard
              label="Total"
              value={formatCurrency(quote.total_amount, quote.currency_code)}
            />
            <MetricCard
              label="Break-even"
              value={
                quote.break_even_amount != null
                  ? formatCurrency(quote.break_even_amount, quote.currency_code)
                  : "-"
              }
            />
            <MetricCard
              label="Profit"
              value={
                quote.profit_amount != null
                  ? formatCurrency(quote.profit_amount, quote.currency_code)
                  : "-"
              }
              valueClassName={marginColor}
            />
            <MetricCard
              label="Min Day Rate"
              value={
                quote.min_daily_rate != null
                  ? formatCurrency(quote.min_daily_rate, quote.currency_code)
                  : "-"
              }
            />
          </div>

          {/* Profitability warning */}
          {!isProfitable && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="text-sm text-red-300">
                This quote is below break-even. Consider increasing your pricing
                or reducing scope.
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Line items */}
      <LineItemTable
        items={quote.line_items}
        currency={quote.currency_code}
        vatAmount={quote.vat_amount}
      />

      {/* Milestones */}
      {sortedMilestones.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium text-zinc-300">
              Payment Milestones
            </h3>
          </CardHeader>
          <CardBody className="space-y-3">
            {sortedMilestones.map((ms, i) => (
              <div
                key={ms.id}
                className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 text-xs font-medium text-zinc-300">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {ms.title}
                    </p>
                    {ms.description && (
                      <p className="text-xs text-zinc-500">{ms.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-white">
                    {formatCurrency(ms.amount_fiat, quote.currency_code)}
                  </span>
                  <MilestoneStatusDot status={ms.status} />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {/* Timing info */}
      {(quote.labor_hours != null || quote.recommended_daily_rate != null) && (
        <Card>
          <CardBody>
            <div className="flex flex-wrap gap-6">
              {quote.labor_hours != null && (
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Clock className="h-4 w-4" />
                  <span>{quote.labor_hours}h estimated labour</span>
                </div>
              )}
              {quote.recommended_daily_rate != null && (
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <TrendingUp className="h-4 w-4" />
                  <span>
                    Recommended day rate:{" "}
                    {formatCurrency(quote.recommended_daily_rate, quote.currency_code)}
                  </span>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Internal sub-components                                           */
/* ------------------------------------------------------------------ */

function MetricCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg bg-zinc-800/50 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${valueClassName ?? "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

function MilestoneStatusDot({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    pending: "bg-zinc-500",
    funded: "bg-green-500",
    in_progress: "bg-blue-500",
    release_requested: "bg-yellow-500",
    released: "bg-green-400",
    disputed: "bg-red-500",
    refunded: "bg-zinc-400",
  };

  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${colorMap[status] ?? "bg-zinc-600"}`}
      title={status.replace("_", " ")}
    />
  );
}
