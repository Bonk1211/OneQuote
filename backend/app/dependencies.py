from dataclasses import dataclass

from fastapi import Depends, HTTPException, Request
from supabase import create_client, Client

from app.config import settings
from app.utils.supabase_helpers import safe_maybe_single


@dataclass
class AuthenticatedUser:
    """Lightweight user identity returned by ``get_current_user``."""
    id: str  # UUID from users table
    onechain_address: str


def get_supabase() -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def get_supabase_anon() -> Client:
    return create_client(settings.supabase_url, settings.supabase_anon_key)


async def get_current_user(
    request: Request, supabase: Client = Depends(get_supabase)
) -> AuthenticatedUser:
    """
    Authenticate via wallet address passed as Bearer token.

    Flow:
    1. Extract wallet address from ``Authorization: Bearer 0x...``
    2. Look up user in ``users`` table by ``onechain_address``
    3. Auto-create user if first time
    4. Return ``AuthenticatedUser`` with UUID and address
    """
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(401, "Missing authorization header")

    wallet_address = auth_header.split(" ", 1)[1].strip()
    if not wallet_address or not wallet_address.startswith("0x"):
        raise HTTPException(401, "Invalid wallet address")

    # Look up existing user
    resp = safe_maybe_single(
        supabase.table("users")
        .select("id, onechain_address")
        .eq("onechain_address", wallet_address)
        .maybe_single()
    )

    if resp.data:
        return AuthenticatedUser(
            id=resp.data["id"],
            onechain_address=wallet_address,
        )

    # Auto-create user on first wallet connection.
    # Use upsert with on_conflict to handle concurrent first-requests safely.
    upsert_resp = (
        supabase.table("users")
        .upsert(
            {
                "onechain_address": wallet_address,
                "email": f"{wallet_address[:10]}@wallet.local",
            },
            on_conflict="onechain_address",
        )
        .execute()
    )

    if not upsert_resp.data:
        raise HTTPException(500, "Failed to create user")

    return AuthenticatedUser(
        id=upsert_resp.data[0]["id"],
        onechain_address=wallet_address,
    )
