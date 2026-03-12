"""
OneChain (Sui-compatible) RPC helper functions.

All calls go through JSON-RPC 2.0 over httpx async HTTP client.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

_RPC_TIMEOUT = 15.0  # seconds


async def _rpc_call(
    rpc_url: str,
    method: str,
    params: list[Any],
    *,
    timeout: float = _RPC_TIMEOUT,
) -> Any:
    """Low-level JSON-RPC 2.0 call."""
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": method,
        "params": params,
    }
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(rpc_url, json=payload)
        resp.raise_for_status()
        body = resp.json()

    if "error" in body:
        error = body["error"]
        logger.error("RPC error on %s: %s", method, error)
        raise RuntimeError(
            f"RPC {method} failed: {error.get('message', str(error))}"
        )

    return body.get("result")


# ─────────────────────────── Event queries ───────────────────────────


async def query_events(
    rpc_url: str,
    event_type: str,
    cursor: Optional[dict] = None,
    limit: int = 50,
    descending: bool = False,
) -> dict:
    """
    Query on-chain events via ``suix_queryEvents``.

    Parameters
    ----------
    rpc_url : str
        The OneChain / Sui RPC endpoint URL.
    event_type : str
        Fully-qualified Move event type, e.g.
        ``"0xpkg::escrow::EscrowCreatedEvent"``.
    cursor : dict | None
        Pagination cursor returned from a previous call
        (``{"txDigest": ..., "eventSeq": ...}``).
    limit : int
        Maximum number of events to return per page.
    descending : bool
        Whether to return results newest-first.

    Returns
    -------
    dict
        ``{"data": [...], "nextCursor": {...} | None, "hasNextPage": bool}``
    """
    query_filter = {"MoveEventType": event_type}
    params: list[Any] = [query_filter, cursor, limit, descending]
    result = await _rpc_call(rpc_url, "suix_queryEvents", params)
    return result  # type: ignore[return-value]


# ─────────────────────────── Object reads ────────────────────────────


async def get_object(
    rpc_url: str,
    object_id: str,
    *,
    show_content: bool = True,
    show_owner: bool = True,
) -> dict:
    """
    Fetch a single on-chain object via ``sui_getObject``.

    Returns the parsed JSON representation including content fields
    by default.
    """
    options = {
        "showType": True,
        "showContent": show_content,
        "showOwner": show_owner,
    }
    result = await _rpc_call(rpc_url, "sui_getObject", [object_id, options])
    return result  # type: ignore[return-value]


# ────────────────────── Transaction submission ───────────────────────


async def execute_transaction(
    rpc_url: str,
    tx_bytes: str,
    signatures: list[str],
    *,
    request_type: str = "WaitForLocalExecution",
    show_effects: bool = True,
    show_events: bool = True,
) -> dict:
    """
    Submit a signed transaction via ``sui_executeTransactionBlock``.

    Parameters
    ----------
    tx_bytes : str
        Base64-encoded BCS transaction bytes.
    signatures : list[str]
        List of Base64-encoded signatures (sender + sponsor).
    request_type : str
        One of ``WaitForEffectsCert``, ``WaitForLocalExecution``.
    show_effects : bool
        Include effects in the response.
    show_events : bool
        Include events in the response.

    Returns
    -------
    dict
        Full transaction response from the RPC.
    """
    options = {
        "showEffects": show_effects,
        "showEvents": show_events,
        "showInput": False,
        "showObjectChanges": True,
    }
    params: list[Any] = [tx_bytes, signatures, options, request_type]
    result = await _rpc_call(
        rpc_url, "sui_executeTransactionBlock", params
    )
    logger.info(
        "Transaction executed: digest=%s",
        result.get("digest", "unknown") if isinstance(result, dict) else "unknown",
    )
    return result  # type: ignore[return-value]


# ──────────────────── Dry-run / inspection helpers ───────────────────


async def dry_run_transaction(
    rpc_url: str,
    tx_bytes: str,
) -> dict:
    """
    Dry-run a transaction to check for errors before signing.
    """
    result = await _rpc_call(
        rpc_url, "sui_dryRunTransactionBlock", [tx_bytes]
    )
    return result  # type: ignore[return-value]


async def get_coins(
    rpc_url: str,
    owner: str,
    coin_type: str,
    limit: int = 10,
) -> list[dict]:
    """
    Get coins of a specific type owned by an address.
    Used to find USDC coins for escrow funding.
    """
    result = await _rpc_call(
        rpc_url,
        "suix_getCoins",
        [owner, coin_type, None, limit],
    )
    return result.get("data", []) if isinstance(result, dict) else []
