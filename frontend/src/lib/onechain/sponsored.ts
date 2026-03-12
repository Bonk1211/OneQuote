/**
 * Sponsored transaction flow helpers.
 *
 * The pattern is:
 * 1. Frontend calls a backend endpoint that builds the transaction and partially signs
 *    it with the gas sponsor key. The backend returns { transaction_bytes, digest }.
 * 2. The user signs the `transaction_bytes` via OneWallet.
 * 3. Frontend sends { digest, signature } back to the backend, which combines
 *    signatures and submits to the network.
 */

import { apiFetch } from "@/lib/api";
import { signTransaction } from "./wallet";
import type { SponsoredTxResponse, SignedTxPayload, SponsoredTxResult } from "@/types/escrow";

/**
 * Complete the user-signing step of a sponsored transaction and submit it
 * via the backend.
 *
 * @param txBytes  Base64-encoded transaction bytes from the backend
 * @param digest   Transaction digest from the backend
 * @param token    Supabase access token for authenticating the submit call
 * @returns        The final on-chain result
 */
export async function signAndSubmitSponsoredTx(
  txBytes: string,
  digest: string,
  token: string
): Promise<SponsoredTxResult> {
  // Step 1: User signs the transaction bytes via OneWallet
  const signature = await signTransaction(txBytes);

  // Step 2: Send the user signature to the backend for final submission
  const payload: SignedTxPayload = { digest, signature };
  const result = await apiFetch<SponsoredTxResult>("/api/escrow/submit", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });

  return result;
}

/**
 * Convenience wrapper: request a sponsored tx from a backend endpoint,
 * have the user sign it, and submit it.
 *
 * @param endpoint  Backend endpoint that returns SponsoredTxResponse (e.g. "/api/escrow/create")
 * @param body      Request body to send to the endpoint
 * @param token     Supabase access token
 */
export async function requestSignAndSubmit(
  endpoint: string,
  body: Record<string, unknown>,
  token: string
): Promise<SponsoredTxResult> {
  // Step 1: Get transaction bytes from the backend
  const { transaction_bytes, digest } = await apiFetch<SponsoredTxResponse>(
    endpoint,
    {
      method: "POST",
      token,
      body: JSON.stringify(body),
    }
  );

  // Step 2 + 3: Sign and submit
  return signAndSubmitSponsoredTx(transaction_bytes, digest, token);
}
