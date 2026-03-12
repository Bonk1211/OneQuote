/**
 * Minimal OneChain JSON-RPC client.
 *
 * Provides typed helpers for the RPC calls we need:
 * fetching objects and querying events.
 */

import { RPC_URL } from "./constants";

/** Generic JSON-RPC 2.0 response envelope */
interface JsonRpcResponse<T> {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: { code: number; message: string };
}

let requestId = 0;

/**
 * Low-level JSON-RPC call.
 */
async function rpcCall<T>(method: string, params: unknown[]): Promise<T> {
  requestId += 1;
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: requestId,
      method,
      params,
    }),
  });

  if (!res.ok) {
    throw new Error(`RPC HTTP error: ${res.status} ${res.statusText}`);
  }

  const data: JsonRpcResponse<T> = await res.json();
  if (data.error) {
    throw new Error(`RPC error ${data.error.code}: ${data.error.message}`);
  }
  if (data.result === undefined) {
    throw new Error("RPC response missing result field");
  }
  return data.result;
}

/** Object data shape returned by onechain_getObject */
export interface ObjectData {
  objectId: string;
  version: string;
  digest: string;
  type: string;
  owner:
    | { AddressOwner: string }
    | { ObjectOwner: string }
    | { Shared: { initial_shared_version: number } }
    | "Immutable";
  content: {
    dataType: "moveObject";
    type: string;
    fields: Record<string, unknown>;
    hasPublicTransfer: boolean;
  } | null;
}

/** Event data shape returned by onechain_queryEvents */
export interface EventData {
  id: { txDigest: string; eventSeq: string };
  packageId: string;
  transactionModule: string;
  sender: string;
  type: string;
  parsedJson: Record<string, unknown>;
  timestampMs: string;
}

interface EventPage {
  data: EventData[];
  nextCursor: { txDigest: string; eventSeq: string } | null;
  hasNextPage: boolean;
}

/**
 * Fetch a single on-chain object by its ID.
 */
export async function getObject(objectId: string): Promise<ObjectData> {
  return rpcCall<ObjectData>("onechain_getObject", [
    objectId,
    {
      showType: true,
      showContent: true,
      showOwner: true,
    },
  ]);
}

/**
 * Query on-chain events by Move event type.
 *
 * @param eventType  Fully qualified event type, e.g. `0x...::escrow::EscrowCreated`
 * @param cursor     Pagination cursor from a previous call
 * @param limit      Max events to return (default 50)
 */
export async function queryEvents(
  eventType: string,
  cursor?: { txDigest: string; eventSeq: string } | null,
  limit: number = 50
): Promise<EventPage> {
  return rpcCall<EventPage>("onechain_queryEvents", [
    { MoveEventType: eventType },
    cursor ?? null,
    limit,
    false, // descending order = false (oldest first)
  ]);
}
