"""
Wallet-based authentication middleware.

Extracts the wallet address from the ``Authorization: Bearer 0x...``
header and makes it available as ``request.state.wallet_address``.
Protected routes use the ``get_current_user`` dependency for full
user resolution; this middleware provides lightweight pass-through.
"""

from __future__ import annotations

import logging

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)

# Paths that bypass authentication
_PUBLIC_PATHS: set[str] = {
    "/api/health",
    "/docs",
    "/redoc",
    "/openapi.json",
}

_PUBLIC_PREFIXES: tuple[str, ...] = (
    "/api/health",
    "/docs",
    "/redoc",
    "/openapi.json",
)


class WalletAuthMiddleware(BaseHTTPMiddleware):
    """
    Lightweight middleware that extracts wallet address from the
    Authorization header and stores it on ``request.state``.
    """

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        path = request.url.path

        # Skip auth for public endpoints
        if path in _PUBLIC_PATHS or path.startswith(_PUBLIC_PREFIXES):
            return await call_next(request)

        # Skip preflight requests
        if request.method == "OPTIONS":
            return await call_next(request)

        auth_header = request.headers.get("authorization", "")

        if auth_header.startswith("Bearer "):
            wallet_address = auth_header.split(" ", 1)[1].strip()
            request.state.wallet_address = wallet_address
        else:
            request.state.wallet_address = None

        return await call_next(request)
