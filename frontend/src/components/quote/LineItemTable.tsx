import { formatCurrency } from "@/lib/utils";
import type { LineItem } from "@/types/database";

interface LineItemTableProps {
  /** Array of line items to display */
  items: LineItem[];
  /** Currency code for formatting (defaults to GBP) */
  currency?: string;
  /** VAT amount in minor units (pence/cents). Pass 0 or omit to hide the VAT row. */
  vatAmount?: number;
}

/**
 * Reusable line items table with description, quantity, rate, and total columns.
 * Includes a footer with subtotal, optional VAT, and grand total.
 */
export function LineItemTable({
  items,
  currency = "GBP",
  vatAmount = 0,
}: LineItemTableProps) {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal + vatAmount;

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-800/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-zinc-400">
              Description
            </th>
            <th className="px-4 py-3 text-right font-medium text-zinc-400">
              Qty
            </th>
            <th className="px-4 py-3 text-right font-medium text-zinc-400">
              Rate
            </th>
            <th className="px-4 py-3 text-right font-medium text-zinc-400">
              Total
            </th>
          </tr>
        </thead>

        <tbody>
          {items.length === 0 && (
            <tr>
              <td
                colSpan={4}
                className="px-4 py-8 text-center text-zinc-500"
              >
                No line items
              </td>
            </tr>
          )}
          {items.map((item, i) => (
            <tr key={i} className="border-t border-zinc-800">
              <td className="px-4 py-3 text-white">{item.description}</td>
              <td className="px-4 py-3 text-right text-zinc-300">
                {item.quantity} {item.unit}
              </td>
              <td className="px-4 py-3 text-right text-zinc-300">
                {formatCurrency(item.unit_price, currency)}
              </td>
              <td className="px-4 py-3 text-right font-medium text-white">
                {formatCurrency(item.total, currency)}
              </td>
            </tr>
          ))}
        </tbody>

        <tfoot className="border-t border-zinc-700 bg-zinc-800/30">
          {/* Subtotal */}
          <tr>
            <td
              colSpan={3}
              className="px-4 py-2.5 text-right text-sm text-zinc-400"
            >
              Subtotal
            </td>
            <td className="px-4 py-2.5 text-right text-sm font-medium text-white">
              {formatCurrency(subtotal, currency)}
            </td>
          </tr>

          {/* VAT row (only shown when non-zero) */}
          {vatAmount > 0 && (
            <tr>
              <td
                colSpan={3}
                className="px-4 py-2.5 text-right text-sm text-zinc-400"
              >
                VAT
              </td>
              <td className="px-4 py-2.5 text-right text-sm font-medium text-white">
                {formatCurrency(vatAmount, currency)}
              </td>
            </tr>
          )}

          {/* Grand total */}
          <tr className="border-t border-zinc-700">
            <td
              colSpan={3}
              className="px-4 py-3 text-right font-semibold text-white"
            >
              Total
            </td>
            <td className="px-4 py-3 text-right text-base font-bold text-white">
              {formatCurrency(total, currency)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
