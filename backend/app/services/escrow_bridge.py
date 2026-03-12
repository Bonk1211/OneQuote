"""
OneChain escrow transaction construction.

Builds ``TransactionBlock``-style payloads for each Move call in the
escrow smart-contract.  The helpers return a hex-encoded BCS
serialisation string suitable for gas sponsorship and user signing.

NOTE: OneChain uses a Sui-compatible RPC and Move VM.  Transaction
construction follows the Programmable Transaction Block (PTB) format.
"""

from __future__ import annotations

import base64
import json
import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_PACKAGE_ID: str = settings.escrow_package_id
_USDC_TYPE: str = settings.usdc_type
_RPC_URL: str = settings.onechain_rpc_url
_RPC_TIMEOUT: float = 15.0

# ───────────────── Low-level transaction builder ─────────────────────


async def _build_move_call_tx(
    sender: str,
    target: str,
    type_arguments: list[str],
    arguments: list[Any],
    gas_budget: int = 50_000_000,
) -> str:
    """
    Use ``unsafe_moveCall`` RPC to build a transaction block containing
    a single Move call, then return the base64-encoded tx_bytes.

    Parameters
    ----------
    sender : str
        Address that will sign the transaction (or be the logical sender).
    target : str
        ``package::module::function`` string.
    type_arguments : list[str]
        Generic type params for the Move function.
    arguments : list
        Positional arguments matching the Move function signature.
    gas_budget : int
        Maximum gas in MIST (default 50M = 0.05 SUI).

    Returns
    -------
    str
        Base64-encoded serialized transaction bytes.
    """
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "unsafe_moveCall",
        "params": [
            sender,
            target.split("::")[0],  # package
            "::".join(target.split("::")[1:2]),  # module
            target.split("::")[-1],  # function
            type_arguments,
            arguments,
            None,  # gas object (auto-select)
            str(gas_budget),
            None,  # execution mode
        ],
    }

    async with httpx.AsyncClient(timeout=_RPC_TIMEOUT) as client:
        resp = await client.post(_RPC_URL, json=payload)
        resp.raise_for_status()
        body = resp.json()

    if "error" in body:
        error_msg = body["error"].get("message", str(body["error"]))
        logger.error("Transaction build failed: %s", error_msg)
        raise RuntimeError(f"Failed to build transaction: {error_msg}")

    tx_bytes: str = body["result"]["txBytes"]
    logger.info(
        "Built transaction for %s (sender=%s, %d bytes)",
        target,
        sender,
        len(base64.b64decode(tx_bytes)),
    )
    return tx_bytes


# ─────────────────── Public transaction builders ─────────────────────


async def build_create_escrow_tx(
    client_address: str,
    operator_address: str,
    amounts: list[int],
    description_hashes: list[str],
    quote_hash: str,
) -> str:
    """
    Build a ``create_escrow`` transaction.

    The Move function signature (expected):
    ``create_escrow<CoinType>(
        client: address,
        operator: address,
        amounts: vector<u64>,
        description_hashes: vector<vector<u8>>,
        quote_hash: vector<u8>,
        ctx: &mut TxContext,
    )``

    Returns base64-encoded transaction bytes.
    """
    # Convert description hashes from hex strings to byte arrays
    desc_hash_bytes = [list(bytes.fromhex(h)) for h in description_hashes]
    quote_hash_bytes = list(bytes.fromhex(quote_hash))

    # Convert amounts to strings for the RPC (u64 values)
    amount_strings = [str(a) for a in amounts]

    target = f"{_PACKAGE_ID}::escrow::create_escrow"

    tx_bytes = await _build_move_call_tx(
        sender=operator_address,
        target=target,
        type_arguments=[_USDC_TYPE],
        arguments=[
            client_address,
            operator_address,
            amount_strings,
            desc_hash_bytes,
            quote_hash_bytes,
        ],
    )
    return tx_bytes


async def build_fund_milestone_tx(
    escrow_object_id: str,
    milestone_index: int,
    amount: int,
    funder_address: str,
    coin_object_id: str,
) -> str:
    """
    Build a ``fund_milestone`` transaction.

    Move signature (expected):
    ``fund_milestone<CoinType>(
        escrow: &mut Escrow<CoinType>,
        milestone_index: u64,
        payment: Coin<CoinType>,
        ctx: &mut TxContext,
    )``
    """
    target = f"{_PACKAGE_ID}::escrow::fund_milestone"

    tx_bytes = await _build_move_call_tx(
        sender=funder_address,
        target=target,
        type_arguments=[_USDC_TYPE],
        arguments=[
            escrow_object_id,
            str(milestone_index),
            coin_object_id,
        ],
    )
    return tx_bytes


async def build_request_release_tx(
    escrow_object_id: str,
    milestone_index: int,
    operator_address: str,
) -> str:
    """
    Build a ``request_release`` transaction (operator requests payment).

    Move signature (expected):
    ``request_release<CoinType>(
        escrow: &mut Escrow<CoinType>,
        milestone_index: u64,
        ctx: &mut TxContext,
    )``
    """
    target = f"{_PACKAGE_ID}::escrow::request_release"

    tx_bytes = await _build_move_call_tx(
        sender=operator_address,
        target=target,
        type_arguments=[_USDC_TYPE],
        arguments=[
            escrow_object_id,
            str(milestone_index),
        ],
    )
    return tx_bytes


async def build_release_milestone_tx(
    escrow_object_id: str,
    milestone_index: int,
    client_address: str,
) -> str:
    """
    Build a ``release_milestone`` transaction (client approves release).

    Move signature (expected):
    ``release_milestone<CoinType>(
        escrow: &mut Escrow<CoinType>,
        milestone_index: u64,
        ctx: &mut TxContext,
    )``
    """
    target = f"{_PACKAGE_ID}::escrow::release_milestone"

    tx_bytes = await _build_move_call_tx(
        sender=client_address,
        target=target,
        type_arguments=[_USDC_TYPE],
        arguments=[
            escrow_object_id,
            str(milestone_index),
        ],
    )
    return tx_bytes


async def build_dispute_milestone_tx(
    escrow_object_id: str,
    milestone_index: int,
    disputer_address: str,
) -> str:
    """
    Build a ``dispute_milestone`` transaction.

    Move signature (expected):
    ``dispute_milestone<CoinType>(
        escrow: &mut Escrow<CoinType>,
        milestone_index: u64,
        ctx: &mut TxContext,
    )``
    """
    target = f"{_PACKAGE_ID}::escrow::dispute_milestone"

    tx_bytes = await _build_move_call_tx(
        sender=disputer_address,
        target=target,
        type_arguments=[_USDC_TYPE],
        arguments=[
            escrow_object_id,
            str(milestone_index),
        ],
    )
    return tx_bytes


async def build_cancel_escrow_tx(
    escrow_object_id: str,
    sender_address: str,
) -> str:
    """
    Build a ``cancel_escrow`` transaction.

    Move signature (expected):
    ``cancel_escrow<CoinType>(
        escrow: &mut Escrow<CoinType>,
        ctx: &mut TxContext,
    )``
    """
    target = f"{_PACKAGE_ID}::escrow::cancel_escrow"

    tx_bytes = await _build_move_call_tx(
        sender=sender_address,
        target=target,
        type_arguments=[_USDC_TYPE],
        arguments=[escrow_object_id],
    )
    return tx_bytes
