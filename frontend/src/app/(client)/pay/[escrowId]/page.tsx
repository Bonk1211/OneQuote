"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  ConnectButton,
  useCurrentAccount,
  useSuiClient,
} from "@mysten/dapp-kit";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { useEscrow } from "@/hooks/useEscrow";
import { USDC_TYPE } from "@/lib/onechain/constants";
import { MilestoneTracker } from "@/components/escrow/MilestoneTracker";
import { EscrowStatusBadge } from "@/components/escrow/EscrowStatusBadge";
import type { Project, Milestone } from "@/types/database";

export default function ClientPaymentPage() {
  const { escrowId } = useParams<{ escrowId: string }>();
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const {
    fundMilestone,
    releaseMilestone,
    disputeMilestone,
    isLoading: txLoading,
    error: txError,
    clearError,
  } = useEscrow();

  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!escrowId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("projects")
      .select("*, milestones(*)")
      .eq("client_access_token", escrowId)
      .single();

    if (data) {
      setProject(data as Project);
      setMilestones((data.milestones as Milestone[]) || []);
    }
    setLoading(false);
  }, [escrowId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const getPaymentCoin = async (amount: bigint): Promise<string> => {
    if (!account?.address) throw new Error("Wallet not connected");

    const { data: coins } = await suiClient.getCoins({
      owner: account.address,
      coinType: USDC_TYPE,
    });

    const coin = coins.find((c) => BigInt(c.balance) >= amount);
    if (!coin) {
      throw new Error(
        `Insufficient USDC balance. Need ${amount.toString()} but no single coin has enough.`
      );
    }
    return coin.coinObjectId;
  };

  const handleAction = async (
    milestoneId: string,
    action: "request_release" | "release" | "fund" | "dispute"
  ) => {
    if (!project?.escrow_object_id) return;
    const ms = milestones.find((m) => m.id === milestoneId);
    if (!ms) return;

    setActionError(null);
    clearError();

    try {
      const params = {
        escrowObjectId: project.escrow_object_id,
        milestoneIndex: ms.sequence_number,
      };

      if (action === "fund") {
        const amount = BigInt(ms.amount_fiat);
        const coinId = await getPaymentCoin(amount);
        await fundMilestone({
          ...params,
          paymentCoinId: coinId,
          amount,
        });
      } else if (action === "release") {
        await releaseMilestone(params);
      } else if (action === "dispute") {
        await disputeMilestone(params);
      }

      // Wait for event indexer to sync, then refresh
      setTimeout(() => fetchProject(), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      setActionError(msg);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <p className="text-zinc-500">Loading...</p>
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

        <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Total Amount</span>
            <span className="text-xl font-bold text-white">
              {formatCurrency(project.total_quoted_amount)}
            </span>
          </div>
        </div>

        {(actionError || txError) && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm text-red-300">{actionError || txError}</p>
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
    </div>
  );
}
