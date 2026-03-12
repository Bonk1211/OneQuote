"use client";

import { useState, useCallback } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { requestSignAndSubmit } from "@/lib/onechain/sponsored";
import type { SponsoredTxResult } from "@/types/escrow";

interface UseEscrowReturn {
  createEscrow: (projectId: string) => Promise<SponsoredTxResult>;
  fundMilestone: (escrowObjectId: string, milestoneIndex: number) => Promise<SponsoredTxResult>;
  requestRelease: (escrowObjectId: string, milestoneIndex: number) => Promise<SponsoredTxResult>;
  releaseMilestone: (escrowObjectId: string, milestoneIndex: number) => Promise<SponsoredTxResult>;
  disputeMilestone: (escrowObjectId: string, milestoneIndex: number) => Promise<SponsoredTxResult>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useEscrow(): UseEscrowReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const account = useCurrentAccount();

  const clearError = useCallback(() => setError(null), []);

  const execute = useCallback(
    async (
      endpoint: string,
      body: Record<string, unknown>
    ): Promise<SponsoredTxResult> => {
      if (!account?.address) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await requestSignAndSubmit(
          endpoint,
          body,
          account.address
        );

        if (result.effects.status.status !== "success") {
          throw new Error("Transaction failed on-chain. Please try again.");
        }

        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unknown error occurred";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [account?.address]
  );

  const createEscrow = useCallback(
    (projectId: string) =>
      execute("/api/escrow/create", { project_id: projectId }),
    [execute]
  );

  const fundMilestone = useCallback(
    (escrowObjectId: string, milestoneIndex: number) =>
      execute("/api/escrow/fund", {
        escrow_object_id: escrowObjectId,
        milestone_index: milestoneIndex,
      }),
    [execute]
  );

  const requestRelease = useCallback(
    (escrowObjectId: string, milestoneIndex: number) =>
      execute("/api/escrow/request-release", {
        escrow_object_id: escrowObjectId,
        milestone_index: milestoneIndex,
      }),
    [execute]
  );

  const releaseMilestone = useCallback(
    (escrowObjectId: string, milestoneIndex: number) =>
      execute("/api/escrow/release", {
        escrow_object_id: escrowObjectId,
        milestone_index: milestoneIndex,
      }),
    [execute]
  );

  const disputeMilestone = useCallback(
    (escrowObjectId: string, milestoneIndex: number) =>
      execute("/api/escrow/dispute", {
        escrow_object_id: escrowObjectId,
        milestone_index: milestoneIndex,
      }),
    [execute]
  );

  return {
    createEscrow,
    fundMilestone,
    requestRelease,
    releaseMilestone,
    disputeMilestone,
    isLoading,
    error,
    clearError,
  };
}
