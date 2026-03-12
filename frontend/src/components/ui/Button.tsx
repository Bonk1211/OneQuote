"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Show a loading spinner and disable the button */
  loading?: boolean;
  /** Render as a child element (e.g. wrapping a Next.js Link). When true, renders a <span> instead of <button>. */
  asChild?: boolean;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500",
  secondary:
    "border border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white focus-visible:ring-zinc-500",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
  ghost:
    "bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white focus-visible:ring-zinc-500",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2.5 text-sm gap-2",
  lg: "px-6 py-3 text-base gap-2.5",
};

/**
 * Reusable button component with variant, size, and loading state support.
 *
 * Supports an `asChild` pattern: when true, renders a `<span>` wrapper so you
 * can nest a `<Link>` inside for navigation buttons.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      asChild = false,
      className,
      disabled,
      children,
      ...props
    },
    ref
  ) {
    const classes = cn(
      "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
      "disabled:cursor-not-allowed disabled:opacity-50",
      variantStyles[variant],
      sizeStyles[size],
      className
    );

    if (asChild) {
      return (
        <span className={classes} data-loading={loading || undefined}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {children}
        </span>
      );
    }

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
