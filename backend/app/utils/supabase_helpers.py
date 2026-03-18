"""Supabase query helpers.

The ``maybe_single()`` modifier in the Supabase Python SDK v2.x can
return ``None`` instead of a response object when zero rows match.
The helper below wraps this behaviour so callers can safely access
``.data`` without guarding against ``NoneType``.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class _EmptyResponse:
    """Minimal stand-in for a Supabase response with no data."""
    data: None = None


def safe_maybe_single(query) -> Any:
    """Execute a Supabase query chain that ends with ``.maybe_single()``.

    Usage::

        resp = safe_maybe_single(
            supabase.table("users")
            .select("id")
            .eq("onechain_address", addr)
            .maybe_single()
        )
        if resp.data:
            ...

    Returns a response whose ``.data`` is either the matching row dict
    or ``None`` — but **never** raises or returns ``None`` itself.
    """
    try:
        result = query.execute()
    except Exception:
        return _EmptyResponse()

    if result is None:
        return _EmptyResponse()

    return result
