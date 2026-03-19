"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import {
  ConnectButton,
  useCurrentAccount,
} from "@mysten/dapp-kit";
import { apiFetch } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useEscrow } from "@/hooks/useEscrow";
import { getExplorerUrl } from "@/lib/onechain/constants";
import { MilestoneTracker } from "@/components/escrow/MilestoneTracker";
import { EscrowStatusBadge } from "@/components/escrow/EscrowStatusBadge";
import { CheckCircle2, ExternalLink, Loader2, XCircle } from "lucide-react";
import type { Project, Milestone, MilestoneStatus } from "@/types/database";

type Toast = {
  id: number;
  type: "success" | "error";
  title: string;
  message?: string;
  txDigest?: string;
};

export default function ClientPaymentPage() {
  const { escrowId } = useParams<{ escrowId: string }>();
  const account = useCurrentAccount();
  const {
    fundMilestone,
    releaseMilestone,
    disputeMilestone,
    resolveDispute,
    isLoading: txLoading,
    clearError,
  } = useEscrow();

  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeMilestoneId, setActiveMilestoneId] = useState<string | null>(null);
  // Track optimistic overrides: milestoneId -> status
  const optimisticRef = useRef<Record<string, MilestoneStatus>>({});
  const toastIdRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000);
  }, []);

  const fetchProject = useCallback(async () => {
    if (!escrowId) return;
    try {
      const data = await apiFetch<Project & { milestones: Milestone[] }>(
        `/api/projects/pay/${escrowId}`
      );
      setProject(data);

      const serverMilestones = data.milestones || [];
      // Merge: if backend has caught up (status matches or advanced), clear the optimistic override.
      // Otherwise keep showing the optimistic status.
      const merged = serverMilestones.map((m) => {
        const opt = optimisticRef.current[m.id];
        if (!opt) return m;
        if (m.status !== "pending") {
          // Backend caught up — clear override
          delete optimisticRef.current[m.id];
          return m;
        }
        return { ...m, status: opt };
      });
      setMilestones(merged);
    } catch {
      // project not found
    }
    setLoading(false);
  }, [escrowId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // Clean up poll timer on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current !== null) clearInterval(pollTimerRef.current);
    };
  }, []);

  const statusAfterAction: Record<string, MilestoneStatus> = {
    fund: "funded",
    release: "released",
    dispute: "disputed",
    resolve_dispute: "funded",
  };

  const actionLabels: Record<string, string> = {
    fund: "Funded",
    release: "Released",
    dispute: "Disputed",
    resolve_dispute: "Dispute Resolved",
  };

  const handleAction = async (
    milestoneId: string,
    action: "request_release" | "release" | "fund" | "dispute" | "resolve_dispute"
  ) => {
    if (!project?.escrow_object_id) return;
    const ms = milestones.find((m) => m.id === milestoneId);
    if (!ms) return;

    setActiveMilestoneId(milestoneId);
    clearError();

    try {
      const params = {
        escrowObjectId: project.escrow_object_id,
        milestoneIndex: ms.sequence_number - 1,
      };

      let result;
      if (action === "fund") {
        const amount = BigInt(ms.amount_fiat);
        result = await fundMilestone({
          ...params,
          paymentCoinId: "",
          amount,
          useGasCoin: true,
        });
      } else if (action === "release") {
        result = await releaseMilestone(params);
      } else if (action === "dispute") {
        result = await disputeMilestone(params);
      } else if (action === "resolve_dispute") {
        result = await resolveDispute(params);
      }

      // Update milestone status in DB immediately after confirmed on-chain tx
      const newStatus = statusAfterAction[action];
      if (newStatus) {
        // Optimistic UI update
        setMilestones((prev) =>
          prev.map((m) =>
            m.id === milestoneId ? { ...m, status: newStatus } : m
          )
        );

        // Persist to DB so contractor side sees the update
        try {
          await apiFetch(`/api/projects/pay/${escrowId}/milestones`, {
            method: "PATCH",
            body: JSON.stringify({
              milestone_index: ms.sequence_number - 1,
              status: newStatus,
              tx_digest: result?.digest ?? null,
            }),
          });
        } catch {
          // Non-critical — indexer will eventually catch up
        }
      }

      addToast({
        type: "success",
        title: `Milestone ${actionLabels[action] ?? action}!`,
        message: ms.title,
        txDigest: result?.digest,
      });

      // Refresh from DB to get canonical state
      await fetchProject();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      addToast({
        type: "error",
        title: "Transaction Failed",
        message: msg,
      });
    } finally {
      setActiveMilestoneId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <p className="text-zinc-400">Project not found or invalid access link</p>
      </div>
    );
  }

  const walletConnected = !!account?.address;
  const escrowExists = !!project.escrow_object_id;
  const totalFunded = milestones
    .filter((m) => m.status !== "pending")
    .reduce((sum, m) => sum + m.amount_fiat, 0);

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <h1 className="text-xl font-bold text-white">
          Quote<span className="text-indigo-400">Guard</span>
          <span className="ml-2 text-sm font-normal text-zinc-500">Payment Portal</span>
        </h1>
        <ConnectButton />
      </header>

      <div className="mx-auto max-w-2xl p-6">
        {!walletConnected && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-sm text-amber-300">
              Connect your OneWallet to fund milestones and approve releases.
            </p>
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">{project.title}</h2>
            <EscrowStatusBadge status={project.status} type="project" />
          </div>
          <p className="mt-1 text-sm text-zinc-400">{project.description}</p>
        </div>

        {/* Progress + Total */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Total Amount</span>
            <p className="mt-1 text-xl font-bold text-white">
              {formatCurrency(project.total_quoted_amount)}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Funded</span>
            <p className="mt-1 text-xl font-bold text-emerald-400">
              {formatCurrency(totalFunded)}
            </p>
            {project.total_quoted_amount > 0 && (
              <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (totalFunded / project.total_quoted_amount) * 100)}%`,
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Transaction in progress overlay */}
        {txLoading && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
            <p className="text-sm text-indigo-300">
              Processing transaction... Please confirm in your wallet.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="mb-4 text-sm font-medium text-zinc-300">Payment Schedule</h3>
          <MilestoneTracker
            milestones={milestones}
            userRole="client"
            onAction={walletConnected && escrowExists ? handleAction : undefined}
            disabled={txLoading}
          />
          {!escrowExists && (
            <p className="mt-4 text-center text-xs text-zinc-500">
              Escrow has not been created yet. The contractor will set it up first.
            </p>
          )}
        </div>

        <div className="mt-6 text-center">
          <a
            href="https://faucet.testnet.onechain.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-400 hover:text-indigo-300"
          >
            Need testnet tokens? Get them from the faucet
          </a>
        </div>
      </div>

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 rounded-xl border p-4 shadow-2xl backdrop-blur-sm animate-in slide-in-from-right-5 fade-in duration-300 ${
              toast.type === "success"
                ? "border-emerald-500/30 bg-emerald-950/90"
                : "border-red-500/30 bg-red-950/90"
            }`}
            style={{ minWidth: 320, maxWidth: 420 }}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            ) : (
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${
                toast.type === "success" ? "text-emerald-300" : "text-red-300"
              }`}>
                {toast.title}
              </p>
              {toast.message && (
                <p className="mt-0.5 text-xs text-zinc-400 truncate">{toast.message}</p>
              )}
              {toast.txDigest && (
                <a
                  href={getExplorerUrl(toast.txDigest)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
                >
                  View on Explorer <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
