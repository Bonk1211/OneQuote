"""
Gas sponsorship service for OneChain transactions.

Allows the platform to pay gas on behalf of users so they can interact
with escrow contracts without holding native tokens.  Uses the
``gas_sponsor_private_key`` from settings to sign the gas portion of
Programmable Transaction Blocks.
"""

from __future__ import annotations

import base64
import hashlib
import logging
from typing import Any

import httpx

from app.config import settings
from app.utils.onechain_helpers import execute_transaction

logger = logging.getLogger(__name__)

_RPC_URL: str = settings.onechain_rpc_url
_RPC_TIMEOUT: float = 15.0


def _derive_keypair() -> tuple[bytes, bytes]:
    """
    Derive a Ed25519 keypair from the configured private key.

    The private key in config is expected to be a hex-encoded 32-byte
    Ed25519 seed (or a 64-byte full keypair where the first 32 bytes
    are the seed).

    Returns (private_key_bytes, public_key_bytes).
    """
    try:
        from nacl.signing import SigningKey  # type: ignore[import-untyped]
    except ImportError:
        raise RuntimeError(
            "PyNaCl is required for gas sponsorship. "
            "Install with: pip install pynacl"
        )

    raw = settings.gas_sponsor_private_key
    # Support base64 or hex encoding
    try:
        key_bytes = bytes.fromhex(raw)
    except ValueError:
        key_bytes = base64.b64decode(raw)

    # Ed25519 seed is 32 bytes; full keypair is 64 (seed + public)
    seed = key_bytes[:32]
    signing_key = SigningKey(seed)
    return bytes(signing_key), bytes(signing_key.verify_key)


def _sign_data(data: bytes) -> str:
    """
    Sign raw bytes with the sponsor's Ed25519 key.

    Returns a base64-encoded signature with the Sui Ed25519 scheme flag
    byte (0x00) prepended.
    """
    try:
        from nacl.signing import SigningKey  # type: ignore[import-untyped]
    except ImportError:
        raise RuntimeError("PyNaCl is required for gas sponsorship.")

    raw = settings.gas_sponsor_private_key
    try:
        key_bytes = bytes.fromhex(raw)
    except ValueError:
        key_bytes = base64.b64decode(raw)

    seed = key_bytes[:32]
    signing_key = SigningKey(seed)
    signed = signing_key.sign(data)
    signature_bytes = signed.signature  # 64 bytes

    # Sui signature format: flag (1 byte) + signature (64 bytes) + pubkey (32 bytes)
    flag = b"\x00"  # Ed25519 scheme
    pubkey = bytes(signing_key.verify_key)
    full_sig = flag + signature_bytes + pubkey

    return base64.b64encode(full_sig).decode("ascii")


def _get_sponsor_address() -> str:
    """Derive the Sui address from the sponsor's public key."""
    try:
        from nacl.signing import SigningKey  # type: ignore[import-untyped]
    except ImportError:
        raise RuntimeError("PyNaCl is required for gas sponsorship.")

    raw = settings.gas_sponsor_private_key
    try:
        key_bytes = bytes.fromhex(raw)
    except ValueError:
        key_bytes = base64.b64decode(raw)

    seed = key_bytes[:32]
    signing_key = SigningKey(seed)
    pubkey = bytes(signing_key.verify_key)

    # Sui address = BLAKE2b-256(0x00 || pubkey), take first 32 bytes
    h = hashlib.blake2b(b"\x00" + pubkey, digest_size=32)
    return "0x" + h.hexdigest()


# ────────────────────── Public API ───────────────────────────────────


async def sponsor_transaction(tx_bytes: str) -> tuple[str, str]:
    """
    Sponsor a transaction by requesting gas sponsorship from the RPC.

    Uses ``sui_requestAddStakeWithSponsor`` pattern: the platform
    wallet is set as the gas sponsor for the given transaction.

    Parameters
    ----------
    tx_bytes : str
        Base64-encoded transaction bytes (unsigned, from the builder).

    Returns
    -------
    tuple[str, str]
        ``(sponsored_tx_bytes, sponsor_signature)`` where both are
        base64-encoded strings.  The ``sponsored_tx_bytes`` is the
        modified transaction that includes gas payment from the sponsor.

    Raises
    ------
    RuntimeError
        If the RPC call or signing fails.
    """
    sponsor_address = _get_sponsor_address()

    # Step 1: Request the RPC to produce a sponsored transaction
    # Using unsafe_requestSuiFromFaucet or manual gas object selection
    # In practice we use the TransactionBlock approach:
    # set the gas owner to the sponsor address via RPC
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "sui_requestSponsoredTransaction",
        "params": [tx_bytes, sponsor_address],
    }

    async with httpx.AsyncClient(timeout=_RPC_TIMEOUT) as client:
        resp = await client.post(_RPC_URL, json=payload)
        resp.raise_for_status()
        body = resp.json()

    # If the custom sponsor RPC is not available, fall back to
    # signing the original tx_bytes directly as sponsor
    if "error" in body:
        logger.warning(
            "Custom sponsor RPC unavailable, signing tx_bytes directly: %s",
            body["error"].get("message", ""),
        )
        # Fall back: treat the original tx as the sponsored tx
        # The sponsor signs the intent message: INTENT || tx_bytes
        # Intent for TransactionData: [0, 0, 0]
        raw_tx = base64.b64decode(tx_bytes)
        intent_msg = bytes([0, 0, 0]) + raw_tx
        digest = hashlib.blake2b(intent_msg, digest_size=32).digest()

        sponsor_sig = _sign_data(digest)

        logger.info(
            "Sponsored transaction (fallback): sponsor=%s, tx_len=%d",
            sponsor_address,
            len(raw_tx),
        )
        return tx_bytes, sponsor_sig

    sponsored_tx_bytes = body["result"]["txBytes"]
    # Sign the sponsored transaction as the gas sponsor
    raw_tx = base64.b64decode(sponsored_tx_bytes)
    intent_msg = bytes([0, 0, 0]) + raw_tx
    digest = hashlib.blake2b(intent_msg, digest_size=32).digest()
    sponsor_sig = _sign_data(digest)

    logger.info(
        "Sponsored transaction: sponsor=%s, digest=%s",
        sponsor_address,
        hashlib.blake2b(raw_tx, digest_size=32).hexdigest()[:16],
    )
    return sponsored_tx_bytes, sponsor_sig


async def submit_sponsored_tx(
    tx_bytes: str,
    user_signature: str,
    sponsor_signature: str | None = None,
) -> str:
    """
    Combine the user's signature with the sponsor's signature and
    submit the transaction to the network.

    Parameters
    ----------
    tx_bytes : str
        Base64-encoded sponsored transaction bytes.
    user_signature : str
        Base64-encoded user signature over the tx intent message.
    sponsor_signature : str | None
        Base64-encoded sponsor signature.  If not provided, the
        platform will re-sign the transaction.

    Returns
    -------
    str
        The transaction digest.

    Raises
    ------
    RuntimeError
        If submission fails.
    """
    # If we need to re-sign as sponsor
    if sponsor_signature is None:
        raw_tx = base64.b64decode(tx_bytes)
        intent_msg = bytes([0, 0, 0]) + raw_tx
        digest = hashlib.blake2b(intent_msg, digest_size=32).digest()
        sponsor_signature = _sign_data(digest)

    # Combine signatures: user first, then sponsor
    signatures = [user_signature, sponsor_signature]

    result = await execute_transaction(
        rpc_url=_RPC_URL,
        tx_bytes=tx_bytes,
        signatures=signatures,
    )

    tx_digest = result.get("digest", "")
    effects = result.get("effects", {})
    status = effects.get("status", {}).get("status", "unknown")

    if status != "success":
        error_msg = effects.get("status", {}).get("error", "Transaction failed")
        logger.error(
            "Sponsored tx failed: digest=%s, error=%s", tx_digest, error_msg
        )
        raise RuntimeError(f"Transaction execution failed: {error_msg}")

    logger.info("Sponsored transaction submitted: digest=%s", tx_digest)
    return tx_digest
