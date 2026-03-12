import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
}

interface CardSectionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Card wrapper with zinc-900 background, zinc-800 border, and rounded-xl corners.
 */
export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-800 bg-zinc-900",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Card header section with a bottom border separator.
 */
export function CardHeader({ children, className }: CardSectionProps) {
  return (
    <div
      className={cn(
        "border-b border-zinc-800 px-5 py-4",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Card body / main content area.
 */
export function CardBody({ children, className }: CardSectionProps) {
  return (
    <div className={cn("px-5 py-4", className)}>
      {children}
    </div>
  );
}

/**
 * Card footer section with a top border separator.
 */
export function CardFooter({ children, className }: CardSectionProps) {
  return (
    <div
      className={cn(
        "border-t border-zinc-800 px-5 py-4",
        className
      )}
    >
      {children}
    </div>
  );
}
