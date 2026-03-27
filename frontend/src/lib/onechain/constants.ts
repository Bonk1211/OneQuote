/**
 * OneChain network configuration and contract addresses.
 * All values are read from environment variables at build time.
 */

/** Published Move package ID for the OneQuote escrow contract */
export const PACKAGE_ID =
  process.env.NEXT_PUBLIC_ESCROW_PACKAGE_ID ?? "";

/** Fully qualified USDC coin type on OneChain */
export const USDC_TYPE =
  process.env.NEXT_PUBLIC_USDC_TYPE ?? "";

/** OneChain JSON-RPC endpoint */
export const RPC_URL =
  process.env.NEXT_PUBLIC_ONECHAIN_RPC_URL ?? "https://rpc.onechain.io";

/** The network we are targeting (mainnet | testnet | devnet) */
export type OneChainNetwork = "mainnet" | "testnet" | "devnet";

export function getNetwork(): OneChainNetwork {
  const url = RPC_URL.toLowerCase();
  if (url.includes("testnet")) return "testnet";
  if (url.includes("devnet")) return "devnet";
  return "mainnet";
}

/** Explorer base URL for the active network */
export function getExplorerUrl(digest: string): string {
  const network = getNetwork();
  const base =
    network === "mainnet"
      ? "https://explorer.onechain.io"
      : `https://explorer.${network}.onechain.io`;
  return `${base}/txblock/${digest}`;
}
