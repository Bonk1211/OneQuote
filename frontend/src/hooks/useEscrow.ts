"use client";

import { useState, useCallback } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import type { Transaction } from "@mysten/sui/transactions";
import {
  buildCreateEscrow,
  buildFundMilestone,
  buildRequestRelease,
  buildReleaseMilestone,
  buildDisputeMilestone,
  buildCancelEscrow,
  type CreateEscrowParams,
  type FundMilestoneParams,
  type MilestoneActionParams,
  type CancelEscrowParams,
} from "@/lib/onechain/transactions";

interface ObjectChange {
  type: string;
  objectType?: string;
  objectId?: string;
}

interface TxResult {
  digest: string;
  objectChanges?: ObjectChange[];
}

interface UseEscrowReturn {
  createEscrow: (params: CreateEscrowParams) => Promise<TxResult>;
  fundMilestone: (params: FundMilestoneParams) => Promise<TxResult>;
  requestRelease: (params: MilestoneActionParams) => Promise<TxResult>;
  releaseMilestone: (params: MilestoneActionParams) => Promise<TxResult>;
  disputeMilestone: (params: MilestoneActionParams) => Promise<TxResult>;
  cancelEscrow: (params: CancelEscrowParams) => Promise<TxResult>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useEscrow(): UseEscrowReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      await client.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showEffects: true,
          showObjectChanges: true,
          showEvents: true,
        },
      }),
  });

  const clearError = useCallback(() => setError(null), []);

  const execute = useCallback(
    async (tx: Transaction): Promise<TxResult> => {
      if (!account?.address) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await signAndExecute({ transaction: tx });

        console.log("[useEscrow] Full tx result:", JSON.stringify(result, null, 2));

        if (result.effects?.status?.status !== "success") {
          const errorDetail =
            result.effects?.status?.error
            || (result.rawEffects ? `rawEffects present (digest: ${result.digest})` : null)
            || JSON.stringify(result.effects ?? result);
          throw new Error(`Transaction failed on-chain: ${errorDetail}`);
        }

        return { digest: result.digest, objectChanges: result.objectChanges as ObjectChange[] | undefined };
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : typeof err === "string"
              ? err
              : JSON.stringify(err) !== "{}"
                ? JSON.stringify(err)
                : "Transaction rejected or unknown error";
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [account?.address, signAndExecute]
  );

  const createEscrow = useCallback(
    (params: CreateEscrowParams) => execute(buildCreateEscrow(params)),
    [execute]
  );

  const fundMilestone = useCallback(
    (params: FundMilestoneParams) => execute(buildFundMilestone(params)),
    [execute]
  );

  const requestRelease = useCallback(
    (params: MilestoneActionParams) => execute(buildRequestRelease(params)),
    [execute]
  );

  const releaseMilestone = useCallback(
    (params: MilestoneActionParams) => execute(buildReleaseMilestone(params)),
    [execute]
  );

  const disputeMilestone = useCallback(
    (params: MilestoneActionParams) => execute(buildDisputeMilestone(params)),
    [execute]
  );

  const cancelEscrow = useCallback(
    (params: CancelEscrowParams) => execute(buildCancelEscrow(params)),
    [execute]
  );

  return {
    createEscrow,
    fundMilestone,
    requestRelease,
    releaseMilestone,
    disputeMilestone,
    cancelEscrow,
    isLoading,
    error,
    clearError,
  };
}
