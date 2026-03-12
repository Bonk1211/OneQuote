/** Matches backend EscrowCreateRequest */
export interface EscrowCreateRequest {
  project_id: string;
}

/** Matches backend FundMilestoneRequest */
export interface FundMilestoneRequest {
  escrow_object_id: string;
  milestone_index: number;
}

/** Matches backend ReleaseRequest */
export interface ReleaseRequest {
  escrow_object_id: string;
  milestone_index: number;
}

/** Matches backend DisputeRequest */
export interface DisputeRequest {
  escrow_object_id: string;
  milestone_index: number;
}

/** Matches backend SignedTxPayload */
export interface SignedTxPayload {
  digest: string;
  signature: string;
}

/** Matches backend SponsoredTxResponse */
export interface SponsoredTxResponse {
  transaction_bytes: string;
  digest: string;
}

/** On-chain escrow object shape returned from RPC queries */
export interface OnChainEscrow {
  objectId: string;
  version: string;
  digest: string;
  owner: string;
  milestoneCount: number;
  totalAmount: number;
  status: string;
}

/** On-chain milestone data from escrow object fields */
export interface OnChainMilestone {
  index: number;
  amount: number;
  funded: boolean;
  released: boolean;
  disputed: boolean;
}

/** Result of signing and submitting a sponsored transaction */
export interface SponsoredTxResult {
  digest: string;
  effects: {
    status: { status: "success" | "failure" };
    gasUsed: {
      computationCost: string;
      storageCost: string;
      storageRebate: string;
    };
  };
}
