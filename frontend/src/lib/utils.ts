import { type ClassValue, clsx } from "clsx";

// Simple class merger (no twMerge dependency needed for now)
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(
  amountMinorUnits: number,
  currency: string = "USD"
): string {
  const amount = amountMinorUnits / 100;
  const symbol = { GBP: "\u00a3", USD: "$", EUR: "\u20ac" }[currency] || currency;
  return `${symbol}${amount.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
