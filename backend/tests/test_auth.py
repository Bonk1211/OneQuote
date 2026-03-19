"""Tests for wallet-first authentication flow."""

from unittest.mock import MagicMock, patch
from dataclasses import dataclass

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.dependencies import AuthenticatedUser, get_current_user
from app.utils.supabase_helpers import safe_maybe_single, _EmptyResponse


# ---------------------------------------------------------------------------
# safe_maybe_single tests
# ---------------------------------------------------------------------------


class TestSafeMaybeSingle:
    def test_returns_response_on_success(self):
        mock_query = MagicMock()
        mock_response = MagicMock()
        mock_response.data = {"id": "abc", "onechain_address": "0xDEAD"}
        mock_query.execute.return_value = mock_response

        result = safe_maybe_single(mock_query)
        assert result.data == {"id": "abc", "onechain_address": "0xDEAD"}

    def test_returns_empty_response_on_none(self):
        mock_query = MagicMock()
        mock_query.execute.return_value = None

        result = safe_maybe_single(mock_query)
        assert isinstance(result, _EmptyResponse)
        assert result.data is None

    def test_returns_empty_response_on_exception(self):
        mock_query = MagicMock()
        mock_query.execute.side_effect = Exception("no rows")

        result = safe_maybe_single(mock_query)
        assert isinstance(result, _EmptyResponse)
        assert result.data is None


# ---------------------------------------------------------------------------
# get_current_user dependency tests
# ---------------------------------------------------------------------------


def _make_request(auth_header: str | None = None) -> MagicMock:
    """Create a mock Request with optional Authorization header."""
    req = MagicMock()
    headers = {}
    if auth_header is not None:
        headers["authorization"] = auth_header
    req.headers = headers
    return req


class TestGetCurrentUser:
    @pytest.mark.asyncio
    async def test_missing_auth_header_raises_401(self):
        req = _make_request(None)
        supabase = MagicMock()
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(req, supabase)
        assert exc_info.value.status_code == 401
        assert "Missing" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_invalid_bearer_format_raises_401(self):
        req = _make_request("Basic abc123")
        supabase = MagicMock()
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(req, supabase)
        assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_non_0x_address_raises_401(self):
        req = _make_request("Bearer not_a_wallet")
        supabase = MagicMock()
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(req, supabase)
        assert exc_info.value.status_code == 401
        assert "Invalid" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_existing_user_returned(self):
        wallet = "0xABCDEF1234567890"
        req = _make_request(f"Bearer {wallet}")

        # Mock Supabase lookup returning existing user
        mock_response = MagicMock()
        mock_response.data = {"id": "uuid-123", "onechain_address": wallet}

        mock_query = MagicMock()
        mock_query.maybe_single.return_value = mock_query
        mock_query.execute.return_value = mock_response

        mock_select = MagicMock()
        mock_select.eq.return_value = mock_query

        mock_table = MagicMock()
        mock_table.select.return_value = mock_select

        supabase = MagicMock()
        supabase.table.return_value = mock_table

        user = await get_current_user(req, supabase)
        assert isinstance(user, AuthenticatedUser)
        assert user.id == "uuid-123"
        assert user.onechain_address == wallet

    @pytest.mark.asyncio
    async def test_new_user_auto_created(self):
        wallet = "0xNEWWALLET999"
        req = _make_request(f"Bearer {wallet}")

        # Mock lookup returning no data
        mock_empty = MagicMock()
        mock_empty.execute.side_effect = Exception("no rows")

        mock_select = MagicMock()
        mock_select.eq.return_value = MagicMock()
        mock_select.eq.return_value.maybe_single.return_value = mock_empty

        # Mock upsert returning new user
        mock_upsert_resp = MagicMock()
        mock_upsert_resp.data = [{"id": "new-uuid-456", "onechain_address": wallet}]

        mock_upsert = MagicMock()
        mock_upsert.execute.return_value = mock_upsert_resp

        mock_table = MagicMock()
        mock_table.select.return_value = mock_select
        mock_table.upsert.return_value = mock_upsert

        supabase = MagicMock()
        supabase.table.return_value = mock_table

        user = await get_current_user(req, supabase)
        assert isinstance(user, AuthenticatedUser)
        assert user.id == "new-uuid-456"
        assert user.onechain_address == wallet

        # Verify upsert was called with correct data
        supabase.table.assert_any_call("users")
        mock_table.upsert.assert_called_once()
        call_args = mock_table.upsert.call_args
        payload = call_args[0][0]
        assert payload["onechain_address"] == wallet
        assert payload["email"] == f"{wallet[:10]}@wallet.local"

    @pytest.mark.asyncio
    async def test_failed_upsert_raises_500(self):
        wallet = "0xFAILWALLET"
        req = _make_request(f"Bearer {wallet}")

        # Mock lookup returning no data
        mock_empty = MagicMock()
        mock_empty.execute.side_effect = Exception("no rows")

        mock_select = MagicMock()
        mock_select.eq.return_value = MagicMock()
        mock_select.eq.return_value.maybe_single.return_value = mock_empty

        # Mock upsert returning empty
        mock_upsert_resp = MagicMock()
        mock_upsert_resp.data = []

        mock_upsert = MagicMock()
        mock_upsert.execute.return_value = mock_upsert_resp

        mock_table = MagicMock()
        mock_table.select.return_value = mock_select
        mock_table.upsert.return_value = mock_upsert

        supabase = MagicMock()
        supabase.table.return_value = mock_table

        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(req, supabase)
        assert exc_info.value.status_code == 500


# ---------------------------------------------------------------------------
# WalletAuthMiddleware tests
# ---------------------------------------------------------------------------


class TestWalletAuthMiddleware:
    def _make_app(self):
        """Create a minimal FastAPI app with the middleware for testing."""
        from fastapi import FastAPI, Request
        from app.middleware.auth import WalletAuthMiddleware

        app = FastAPI()
        app.add_middleware(WalletAuthMiddleware)

        @app.get("/api/health")
        async def health():
            return {"status": "ok"}

        @app.get("/protected")
        async def protected(request: Request):
            return {
                "wallet": getattr(request.state, "wallet_address", None),
            }

        return app

    def test_public_path_skips_auth(self):
        client = TestClient(self._make_app())
        resp = client.get("/api/health")
        assert resp.status_code == 200

    def test_wallet_address_extracted(self):
        client = TestClient(self._make_app())
        resp = client.get(
            "/protected",
            headers={"Authorization": "Bearer 0xTESTADDRESS"},
        )
        assert resp.status_code == 200
        assert resp.json()["wallet"] == "0xTESTADDRESS"

    def test_no_auth_header_sets_none(self):
        client = TestClient(self._make_app())
        resp = client.get("/protected")
        assert resp.status_code == 200
        assert resp.json()["wallet"] is None

    def test_non_bearer_auth_sets_none(self):
        client = TestClient(self._make_app())
        resp = client.get(
            "/protected",
            headers={"Authorization": "Basic abc123"},
        )
        assert resp.status_code == 200
        assert resp.json()["wallet"] is None


# ---------------------------------------------------------------------------
# Auth router integration tests
# ---------------------------------------------------------------------------


class TestAuthRouter:
    def _make_app(self):
        from fastapi import FastAPI
        from app.routers.auth import router
        from app.dependencies import get_current_user

        app = FastAPI()
        app.include_router(router)

        # Override dependency with a mock user
        async def mock_user():
            return AuthenticatedUser(id="test-uuid", onechain_address="0xTEST")

        app.dependency_overrides[get_current_user] = mock_user
        return app

    def test_get_me_returns_user(self):
        client = TestClient(self._make_app())
        resp = client.get("/api/auth/me")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == "test-uuid"
        assert data["onechain_address"] == "0xTEST"
