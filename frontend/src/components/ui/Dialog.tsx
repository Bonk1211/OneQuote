"use client";

import {
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
  type MouseEvent,
} from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  /** Whether the dialog is currently visible */
  open: boolean;
  /** Callback when the dialog should close (backdrop click, Escape, or close button) */
  onClose: () => void;
  /** Optional title displayed in the dialog header */
  title?: string;
  /** Content rendered inside the dialog */
  children: ReactNode;
  /** Additional class names applied to the content panel */
  className?: string;
}

/**
 * Simple modal dialog built on the native `<dialog>` element.
 * Dark theme: zinc-950 overlay, zinc-900 content background.
 *
 * The dialog is always rendered in the DOM but only visible when `open` is true,
 * using the native `showModal` / `close` API for proper focus trapping and
 * accessibility.
 */
export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  // Close on Escape (native dialog behavior) — sync our state
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    el.addEventListener("cancel", handleCancel);
    return () => el.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  // Close on backdrop click
  const handleBackdropClick = useCallback(
    (e: MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className={cn(
        // Backdrop
        "backdrop:bg-zinc-950/70 backdrop:backdrop-blur-sm",
        // Reset native dialog styles
        "bg-transparent p-0 open:flex open:items-center open:justify-center",
        // Full viewport for centering
        "fixed inset-0 m-0 h-screen max-h-screen w-screen max-w-none"
      )}
    >
      <div
        className={cn(
          "relative w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl",
          "animate-in fade-in zoom-in-95",
          className
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Close button when there is no title */}
        {!title && (
          <button
            onClick={onClose}
            className="absolute right-3 top-3 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Content */}
        <div className="px-5 py-4">{children}</div>
      </div>
    </dialog>
  );
}
