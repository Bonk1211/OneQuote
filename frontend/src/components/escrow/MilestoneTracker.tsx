"use client";

import { EscrowStatusBadge } from "./EscrowStatusBadge";
import { formatCurrency } from "@/lib/utils";
import { Bell } from "lucide-react";
import type { Milestone } from "@/types/database";

interface Props {
  milestones: Milestone[];
  userRole: "operator" | "client";
  onAction?: (milestoneId: string, action: "request_release" | "release" | "fund" | "dispute" | "resolve_dispute") => void;
  disabled?: boolean;
}

export function MilestoneTracker({ milestones, userRole, onAction, disabled }: Props) {
  const sorted = [...milestones].sort((a, b) => a.sequence_number - b.sequence_number);
  const hasReleaseRequests = userRole === "client" && sorted.some((ms) => ms.status === "release_requested");

  return (
    <div className="space-y-0">
      {/* Banner for client when contractor has requested releases */}
      {hasReleaseRequests && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <Bell className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-amber-300">
              Action required — Release requested
            </p>
            <p className="mt-0.5 text-xs text-amber-400/70">
              The contractor has marked work as complete. Please review and approve the release to transfer funds.
            </p>
          </div>
        </div>
      )}

      {sorted.map((ms, i) => {
        const isReleaseRequested = ms.status === "release_requested";
        const isDisputed = ms.status === "disputed";
        const needsClientAction = userRole === "client" && isReleaseRequested;
        const needsOperatorAction = userRole === "operator" && isDisputed;

        return (
          <div key={ms.id} className="relative flex gap-4">
            {/* Timeline dot */}
            <div className="flex flex-col items-center">
              <div
                className={`h-4 w-4 rounded-full border-2 ${
                  ms.status === "released"
                    ? "border-green-400 bg-green-400"
                    : isDisputed
                      ? "border-red-400 bg-red-400"
                      : isReleaseRequested
                        ? "border-amber-400 bg-amber-400"
                        : ms.status === "funded"
                          ? "border-indigo-400 bg-indigo-400"
                          : "border-zinc-600 bg-zinc-900"
                }`}
              />
              {i < sorted.length - 1 && (
                <div className="w-0.5 flex-1 bg-zinc-800" />
              )}
            </div>

            {/* Content */}
            <div
              className={`flex-1 pb-6 ${
                needsClientAction
                  ? "rounded-lg -mx-2 px-2 py-2 bg-amber-500/5 border border-amber-500/20"
                  : needsOperatorAction
                    ? "rounded-lg -mx-2 px-2 py-2 bg-red-500/5 border border-red-500/20"
                    : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-medium text-white">{ms.title}</h4>
                  {ms.description && (
                    <p className="mt-0.5 text-xs text-zinc-400">{ms.description}</p>
                  )}
                  {/* Inline message for release_requested on client side */}
                  {needsClientAction && (
                    <p className="mt-1.5 text-xs font-medium text-amber-400">
                      Contractor has completed this milestone and is requesting payment release.
                    </p>
                  )}
                  {/* Inline message for disputed on operator side */}
                  {needsOperatorAction && (
                    <p className="mt-1.5 text-xs font-medium text-red-400">
                      Client has disputed this milestone. Reach out to address their concerns — only the client can resolve the dispute.
                    </p>
                  )}
                  {/* Inline message for disputed on client side */}
                  {userRole === "client" && isDisputed && (
                    <p className="mt-1.5 text-xs font-medium text-red-400">
                      You have raised a dispute. Once resolved with the contractor, click below to lift the dispute.
                    </p>
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
                  {userRole === "operator" && isDisputed && (
                    <span className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400">
                      Awaiting client resolution
                    </span>
                  )}
                  {userRole === "client" && isDisputed && (
                    <button
                      onClick={() => onAction(ms.id, "resolve_dispute")}
                      disabled={disabled}
                      className="rounded-md bg-amber-500 px-4 py-1.5 text-xs font-semibold text-black hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Resolve Dispute
                    </button>
                  )}
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
                  {userRole === "client" && ms.status === "funded" && (
                    <button
                      onClick={() => onAction(ms.id, "release")}
                      disabled={disabled}
                      className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Approve Release
                    </button>
                  )}
                  {userRole === "client" && isReleaseRequested && (
                    <button
                      onClick={() => onAction(ms.id, "release")}
                      disabled={disabled}
                      className="rounded-md bg-amber-500 px-4 py-1.5 text-xs font-semibold text-black hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed animate-pulse"
                    >
                      Approve & Release Payment
                    </button>
                  )}
                  {(ms.status === "funded" || isReleaseRequested) && (
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
        );
      })}
    </div>
  );
}
