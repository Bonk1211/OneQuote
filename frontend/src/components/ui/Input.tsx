"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Label displayed above the input */
  label?: string;
  /** Error message displayed below the input */
  error?: string;
  /** Optional hint text displayed below the input (hidden when error is present) */
  hint?: string;
}

/**
 * Styled text input with optional label and error state.
 * Dark theme: zinc-900 background, zinc-700 border, indigo-500 focus ring.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, hint, className, id, ...props }, ref) {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-zinc-400"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-lg border bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-500",
            "transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-zinc-950",
            error
              ? "border-red-500 focus:ring-red-500"
              : "border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-1.5 text-xs text-red-400"
            role="alert"
          >
            {error}
          </p>
        )}
        {!error && hint && (
          <p className="mt-1.5 text-xs text-zinc-500">{hint}</p>
        )}
      </div>
    );
  }
);
