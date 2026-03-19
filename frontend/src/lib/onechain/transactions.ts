/**
 * Transaction builders for the QuoteGuard escrow contract.
 *
 * Uses the @mysten/sui Transaction API (SDK 2.x) to construct
 * programmable transaction blocks for each escrow entry function.
 * These replace the old raw JSON-RPC `unsafe_moveCall` approach.
 *
 * Each builder returns a `Transaction` that can be signed via
 * dapp-kit's `useSignAndExecuteTransaction` or `useSignTransaction`.
 */

import { Transaction } from "@mysten/sui/transactions";
import { PACKAGE_ID, USDC_TYPE } from "./constants";

/** The Move module path for escrow functions */
const MODULE = `${PACKAGE_ID}::escrow`;

// ─── create_escrow ──────────────────────────────────────────────────

export interface CreateEscrowParams {
  /** Client (payer) address */
  client: string;
  /** Operator (contractor) address */
  operator: string;
  /** Milestone amounts in minor units (e.g. USDC smallest unit) */
  amounts: bigint[];
  /** SHA-256 hashes of each milestone description (as Uint8Array) */
  descriptionHashes: Uint8Array[];
  /** SHA-256 hash of the full quote content */
  quoteHash: Uint8Array;
}

/**
 * Build a `create_escrow<T>` transaction.
 *
 * Move signature:
 * ```
 * public entry fun create_escrow<T>(
 *   client: address, operator: address,
 *   amounts: vector<u64>, description_hashes: vector<vector<u8>>,
 *   quote_hash: vector<u8>, clock: &Clock, ctx: &mut TxContext,
 * )
 * ```
 */
export function buildCreateEscrow(params: CreateEscrowParams): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${MODULE}::create_escrow`,
    typeArguments: [USDC_TYPE],
    arguments: [
      tx.pure.address(params.client),
      tx.pure.address(params.operator),
      tx.pure("vector<u64>", params.amounts.map(Number)),
      tx.pure(
        "vector<vector<u8>>",
        params.descriptionHashes.map((h) => Array.from(h))
      ),
      tx.pure("vector<u8>", Array.from(params.quoteHash)),
      tx.object.clock(),
    ],
  });

  return tx;
}

// ─── fund_milestone ─────────────────────────────────────────────────

export interface FundMilestoneParams {
  /** Shared escrow object ID */
  escrowObjectId: string;
  /** 0-based milestone index */
  milestoneIndex: number;
  /** USDC coin object ID to pay with */
  paymentCoinId: string;
  /** Required payment amount in minor units */
  amount: bigint;
}

/**
 * Build a `fund_milestone<T>` transaction.
 *
 * If the provided coin has more balance than needed, it splits off
 * the exact amount first, keeping the remainder in the user's wallet.
 *
 * Move signature:
 * ```
 * public entry fun fund_milestone<T>(
 *   escrow: &mut Escrow<T>, milestone_index: u64,
 *   payment: Coin<T>, ctx: &mut TxContext,
 * )
 * ```
 */
export function buildFundMilestone(params: FundMilestoneParams): Transaction {
  const tx = new Transaction();

  // Split the exact amount from the provided coin
  const [paymentCoin] = tx.splitCoins(tx.object(params.paymentCoinId), [
    tx.pure.u64(params.amount),
  ]);

  tx.moveCall({
    target: `${MODULE}::fund_milestone`,
    typeArguments: [USDC_TYPE],
    arguments: [
      tx.object(params.escrowObjectId),
      tx.pure.u64(params.milestoneIndex),
      paymentCoin,
    ],
  });

  return tx;
}

// ─── request_release ────────────────────────────────────────────────

export interface MilestoneActionParams {
  /** Shared escrow object ID */
  escrowObjectId: string;
  /** 0-based milestone index */
  milestoneIndex: number;
}

/**
 * Build a `request_release<T>` transaction.
 * Called by the operator (contractor) after completing work.
 *
 * Move signature:
 * ```
 * public entry fun request_release<T>(
 *   escrow: &mut Escrow<T>, milestone_index: u64, ctx: &mut TxContext,
 * )
 * ```
 */
export function buildRequestRelease(
  params: MilestoneActionParams
): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${MODULE}::request_release`,
    typeArguments: [USDC_TYPE],
    arguments: [
      tx.object(params.escrowObjectId),
      tx.pure.u64(params.milestoneIndex),
    ],
  });

  return tx;
}

// ─── release_milestone ──────────────────────────────────────────────

/**
 * Build a `release_milestone<T>` transaction.
 * Called by the client to approve payment to the operator.
 *
 * Move signature:
 * ```
 * public entry fun release_milestone<T>(
 *   escrow: &mut Escrow<T>, milestone_index: u64, ctx: &mut TxContext,
 * )
 * ```
 */
export function buildReleaseMilestone(
  params: MilestoneActionParams
): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${MODULE}::release_milestone`,
    typeArguments: [USDC_TYPE],
    arguments: [
      tx.object(params.escrowObjectId),
      tx.pure.u64(params.milestoneIndex),
    ],
  });

  return tx;
}

// ─── dispute_milestone ──────────────────────────────────────────────

/**
 * Build a `dispute_milestone<T>` transaction.
 * Either client or operator can dispute a funded milestone.
 *
 * Move signature:
 * ```
 * public entry fun dispute_milestone<T>(
 *   escrow: &mut Escrow<T>, milestone_index: u64, ctx: &mut TxContext,
 * )
 * ```
 */
export function buildDisputeMilestone(
  params: MilestoneActionParams
): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${MODULE}::dispute_milestone`,
    typeArguments: [USDC_TYPE],
    arguments: [
      tx.object(params.escrowObjectId),
      tx.pure.u64(params.milestoneIndex),
    ],
  });

  return tx;
}

// ─── cancel_escrow ──────────────────────────────────────────────────

export interface CancelEscrowParams {
  /** Shared escrow object ID */
  escrowObjectId: string;
}

/**
 * Build a `cancel_escrow<T>` transaction.
 * Either client or operator can cancel. Funded milestones are refunded to client.
 *
 * Move signature:
 * ```
 * public entry fun cancel_escrow<T>(
 *   escrow: &mut Escrow<T>, ctx: &mut TxContext,
 * )
 * ```
 */
export function buildCancelEscrow(params: CancelEscrowParams): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${MODULE}::cancel_escrow`,
    typeArguments: [USDC_TYPE],
    arguments: [tx.object(params.escrowObjectId)],
  });

  return tx;
}

// ─── Sponsored transaction helpers ──────────────────────────────────

/**
 * Prepare a transaction for gas sponsorship.
 *
 * Returns the "kind bytes" that can be sent to the backend.
 * The backend wraps them in a full transaction with sponsor gas payment.
 *
 * @param tx       The transaction to sponsor
 * @param sender   The user's wallet address
 * @param client   A SuiClient instance for resolving object refs
 */
export async function buildSponsoredKindBytes(
  tx: Transaction,
  sender: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
): Promise<Uint8Array> {
  tx.setSender(sender);
  const kindBytes = await tx.build({
    client,
    onlyTransactionKind: true,
  });
  return kindBytes;
}
