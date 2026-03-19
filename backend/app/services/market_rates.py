"""
Market rate search via Tavily API.

Fetches current pricing data for services/materials so the AI quoting
engine can reference up-to-date market rates.
"""

from __future__ import annotations

import logging
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)


async def search_market_rates(
    project_description: str,
    currency_code: str = "USD",
) -> str | None:
    """
    Search for current market rates relevant to the project.

    Returns a concise summary string to inject into the LLM context,
    or None if Tavily is not configured / search fails.
    """
    if not settings.tavily_api_key:
        logger.debug("Tavily API key not configured, skipping market rate search")
        return None

    try:
        from tavily import AsyncTavilyClient

        client = AsyncTavilyClient(api_key=settings.tavily_api_key)

        currency_name = {
            "USD": "US dollars",
            "GBP": "British pounds",
            "EUR": "euros",
            "SGD": "Singapore dollars",
            "AUD": "Australian dollars",
        }.get(currency_code, currency_code)

        query = (
            f"current market rate cost pricing for {project_description} "
            f"in {currency_name} 2025 2026"
        )

        response = await client.search(
            query=query,
            search_depth="basic",
            max_results=5,
            include_answer=True,
        )

        # Build a concise context block from the results
        parts: list[str] = []

        # Tavily's AI-generated answer summary
        answer = response.get("answer")
        if answer:
            parts.append(f"Market Overview: {answer}")

        # Individual source snippets
        results = response.get("results", [])
        for r in results[:3]:
            title = r.get("title", "")
            content = r.get("content", "")
            url = r.get("url", "")
            if content:
                # Truncate long snippets
                snippet = content[:300].strip()
                if len(content) > 300:
                    snippet += "..."
                parts.append(f"- {title}: {snippet} (Source: {url})")

        if not parts:
            return None

        return "\n".join(parts)

    except Exception:
        logger.warning("Tavily market rate search failed", exc_info=True)
        return None
