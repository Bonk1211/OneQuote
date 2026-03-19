"use client";

import { EscrowStatusBadge } from "./EscrowStatusBadge";
import { formatCurrency } from "@/lib/utils";
import type { Milestone } from "@/types/database";

interface Props {
  milestones: Milestone[];
  userRole: "operator" | "client";
  onAction?: (milestoneId: string, action: "request_release" | "release" | "fund" | "dispute") => void;
  disabled?: boolean;
}

export function MilestoneTracker({ milestones, userRole, onAction, disabled }: Props) {
  const sorted = [...milestones].sort((a, b) => a.sequence_number - b.sequence_number);

  return (
    <div className="space-y-0">
      {sorted.map((ms, i) => (
        <div key={ms.id} className="relative flex gap-4">
          {/* Timeline line */}
          <div className="flex flex-col items-center">
            <div
              className={`h-4 w-4 rounded-full border-2 ${
                ms.status === "released"
                  ? "border-green-400 bg-green-400"
                  : ms.status === "funded" || ms.status === "release_requested"
                    ? "border-indigo-400 bg-indigo-400"
                    : "border-zinc-600 bg-zinc-900"
              }`}
            />
            {i < sorted.length - 1 && (
              <div className="w-0.5 flex-1 bg-zinc-800" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pb-6">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-medium text-white">{ms.title}</h4>
                {ms.description && (
                  <p className="mt-0.5 text-xs text-zinc-400">{ms.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-white">
                  {formatCurrency(ms.amount_fiat)}
                </span>
                <EscrowStatusBadge status={ms.status} type="milestone" />
              </div>
            </div>

            {/* Action buttons */}
            {onAction && (
              <div className="mt-2 flex gap-2">
                {userRole === "operator" && ms.status === "funded" && (
                  <button
                    onClick={() => onAction(ms.id, "request_release")}
                    disabled={disabled}
                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Request Release
                  </button>
                )}
                {userRole === "client" && ms.status === "pending" && (
                  <button
                    onClick={() => onAction(ms.id, "fund")}
                    disabled={disabled}
                    className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Fund Milestone
                  </button>
                )}
                {userRole === "client" &&
                  (ms.status === "funded" || ms.status === "release_requested") && (
                    <button
                      onClick={() => onAction(ms.id, "release")}
                      disabled={disabled}
                      className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Approve Release
                    </button>
                  )}
                {(ms.status === "funded" || ms.status === "release_requested") && (
                  <button
                    onClick={() => onAction(ms.id, "dispute")}
                    disabled={disabled}
                    className="rounded-md border border-red-500/50 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Dispute
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
