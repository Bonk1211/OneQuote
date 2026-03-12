"""
Background event indexer for OneChain escrow events.

Polls the OneChain RPC for Move events emitted by the escrow contract
and idempotently inserts them into the ``escrow_events`` table.
Side-effects update milestone statuses, project statuses, and funding
totals.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Optional

from app.config import settings
from app.utils.onechain_helpers import query_events

logger = logging.getLogger(__name__)

POLL_INTERVAL_SECONDS: float = 5.0

# Fully-qualified Move event types emitted by the escrow contract
_PACKAGE_ID: str = settings.escrow_package_id

EVENT_TYPES: dict[str, str] = {
    "escrow_created": f"{_PACKAGE_ID}::escrow::EscrowCreatedEvent",
    "milestone_funded": f"{_PACKAGE_ID}::escrow::MilestoneFundedEvent",
    "milestone_released": f"{_PACKAGE_ID}::escrow::MilestoneReleasedEvent",
    "dispute_opened": f"{_PACKAGE_ID}::escrow::DisputeOpenedEvent",
    "escrow_cancelled": f"{_PACKAGE_ID}::escrow::EscrowCancelledEvent",
}


# ───────────────── Cursor persistence ────────────────────────────────


def _load_cursor(supabase: Any, event_key: str) -> Optional[dict]:
    """Load the last-seen cursor for an event type from the DB."""
    resp = (
        supabase.table("indexer_cursors")
        .select("cursor_data")
        .eq("event_key", event_key)
        .maybe_single()
        .execute()
    )
    if resp.data and resp.data.get("cursor_data"):
        return resp.data["cursor_data"]
    return None


def _save_cursor(supabase: Any, event_key: str, cursor: dict) -> None:
    """Persist the cursor for the next polling round."""
    supabase.table("indexer_cursors").upsert(
        {
            "event_key": event_key,
            "cursor_data": cursor,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="event_key",
    ).execute()


# ───────────────── Idempotent event insertion ────────────────────────


def _insert_event(supabase: Any, event: dict, event_key: str) -> bool:
    """
    Insert a single event into ``escrow_events`` idempotently.

    Uses (tx_digest, event_seq) as the natural unique key.
    Returns True if the event was newly inserted, False if it already
    existed.
    """
    tx_digest = event.get("id", {}).get("txDigest", "")
    event_seq = str(event.get("id", {}).get("eventSeq", "0"))
    parsed = event.get("parsedJson", {})

    # Check for existing record
    existing = (
        supabase.table("escrow_events")
        .select("id")
        .eq("tx_digest", tx_digest)
        .eq("event_seq", event_seq)
        .maybe_single()
        .execute()
    )
    if existing.data:
        return False

    supabase.table("escrow_events").insert(
        {
            "tx_digest": tx_digest,
            "event_seq": event_seq,
            "event_type": event_key,
            "package_id": event.get("packageId", ""),
            "sender": event.get("sender", ""),
            "parsed_json": parsed,
            "timestamp_ms": event.get("timestampMs"),
            "indexed_at": datetime.now(timezone.utc).isoformat(),
        }
    ).execute()

    return True


# ────────────────── Side-effect handlers ─────────────────────────────


def _handle_escrow_created(supabase: Any, parsed: dict) -> None:
    """
    Handle EscrowCreatedEvent.

    Expected fields: escrow_id, client, operator, quote_hash, num_milestones.
    Links the on-chain escrow object to the matching project.
    """
    escrow_id = parsed.get("escrow_id", "")
    quote_hash = parsed.get("quote_hash", "")

    if not quote_hash:
        logger.warning("EscrowCreatedEvent missing quote_hash, skipping side-effects")
        return

    # Find the project by its quote content_hash
    quote_resp = (
        supabase.table("quotes")
        .select("id, project_id")
        .eq("content_hash", quote_hash)
        .maybe_single()
        .execute()
    )
    if not quote_resp.data:
        logger.warning("No quote found for hash %s", quote_hash)
        return

    project_id = quote_resp.data["project_id"]

    # Update project with on-chain escrow reference
    supabase.table("projects").update(
        {
            "escrow_object_id": escrow_id,
            "status": "escrow_created",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("id", project_id).execute()

    logger.info(
        "Linked escrow %s to project %s", escrow_id, project_id
    )


def _handle_milestone_funded(supabase: Any, parsed: dict) -> None:
    """
    Handle MilestoneFundedEvent.

    Expected fields: escrow_id, milestone_index, amount, funder.
    Updates the milestone status to 'funded' and increments
    the project's total_funded_amount.
    """
    escrow_id = parsed.get("escrow_id", "")
    milestone_index = int(parsed.get("milestone_index", 0))
    amount = int(parsed.get("amount", 0))

    # Find the project by escrow_object_id
    project_resp = (
        supabase.table("projects")
        .select("id, total_funded_amount")
        .eq("escrow_object_id", escrow_id)
        .maybe_single()
        .execute()
    )
    if not project_resp.data:
        logger.warning("No project found for escrow %s", escrow_id)
        return

    project_id = project_resp.data["id"]
    current_funded = project_resp.data.get("total_funded_amount", 0) or 0

    # Update the specific milestone (sequence_number is 1-based)
    supabase.table("milestones").update(
        {
            "status": "funded",
            "funded_tx_digest": parsed.get("tx_digest", ""),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("project_id", project_id).eq(
        "sequence_number", milestone_index + 1
    ).execute()

    # Update project funding total
    supabase.table("projects").update(
        {
            "total_funded_amount": current_funded + amount,
            "status": "funded",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("id", project_id).execute()

    logger.info(
        "Milestone %d funded for project %s (amount=%d)",
        milestone_index,
        project_id,
        amount,
    )


def _handle_milestone_released(supabase: Any, parsed: dict) -> None:
    """
    Handle MilestoneReleasedEvent.

    Expected fields: escrow_id, milestone_index, amount, recipient.
    Marks the milestone as 'released'.  If all milestones are released,
    marks the project as 'completed'.
    """
    escrow_id = parsed.get("escrow_id", "")
    milestone_index = int(parsed.get("milestone_index", 0))

    project_resp = (
        supabase.table("projects")
        .select("id")
        .eq("escrow_object_id", escrow_id)
        .maybe_single()
        .execute()
    )
    if not project_resp.data:
        logger.warning("No project found for escrow %s", escrow_id)
        return

    project_id = project_resp.data["id"]

    # Mark milestone released
    supabase.table("milestones").update(
        {
            "status": "released",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("project_id", project_id).eq(
        "sequence_number", milestone_index + 1
    ).execute()

    # Check if all milestones for this project are now released
    all_milestones = (
        supabase.table("milestones")
        .select("status")
        .eq("project_id", project_id)
        .execute()
    )
    if all_milestones.data:
        all_released = all(
            m.get("status") == "released" for m in all_milestones.data
        )
        if all_released:
            supabase.table("projects").update(
                {
                    "status": "completed",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            ).eq("id", project_id).execute()
            logger.info("Project %s marked as completed", project_id)

    logger.info(
        "Milestone %d released for project %s",
        milestone_index,
        project_id,
    )


def _handle_dispute_opened(supabase: Any, parsed: dict) -> None:
    """
    Handle DisputeOpenedEvent.

    Expected fields: escrow_id, milestone_index, disputer.
    Marks the milestone and project as 'disputed'.
    """
    escrow_id = parsed.get("escrow_id", "")
    milestone_index = int(parsed.get("milestone_index", 0))

    project_resp = (
        supabase.table("projects")
        .select("id")
        .eq("escrow_object_id", escrow_id)
        .maybe_single()
        .execute()
    )
    if not project_resp.data:
        logger.warning("No project found for escrow %s", escrow_id)
        return

    project_id = project_resp.data["id"]

    supabase.table("milestones").update(
        {
            "status": "disputed",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("project_id", project_id).eq(
        "sequence_number", milestone_index + 1
    ).execute()

    supabase.table("projects").update(
        {
            "status": "disputed",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("id", project_id).execute()

    logger.info(
        "Dispute opened on milestone %d for project %s",
        milestone_index,
        project_id,
    )


def _handle_escrow_cancelled(supabase: Any, parsed: dict) -> None:
    """
    Handle EscrowCancelledEvent.

    Expected fields: escrow_id.
    Marks the project and all milestones as 'cancelled'.
    """
    escrow_id = parsed.get("escrow_id", "")

    project_resp = (
        supabase.table("projects")
        .select("id")
        .eq("escrow_object_id", escrow_id)
        .maybe_single()
        .execute()
    )
    if not project_resp.data:
        logger.warning("No project found for escrow %s", escrow_id)
        return

    project_id = project_resp.data["id"]

    supabase.table("milestones").update(
        {
            "status": "cancelled",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("project_id", project_id).execute()

    supabase.table("projects").update(
        {
            "status": "cancelled",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("id", project_id).execute()

    logger.info("Escrow cancelled for project %s", project_id)


# ──────────────── Side-effect dispatch map ───────────────────────────

_HANDLERS: dict[str, Any] = {
    "escrow_created": _handle_escrow_created,
    "milestone_funded": _handle_milestone_funded,
    "milestone_released": _handle_milestone_released,
    "dispute_opened": _handle_dispute_opened,
    "escrow_cancelled": _handle_escrow_cancelled,
}


# ──────────────── Process a single event batch ───────────────────────


def _process_event(supabase: Any, event: dict, event_key: str) -> None:
    """Insert an event and run side-effects if it is new."""
    is_new = _insert_event(supabase, event, event_key)
    if not is_new:
        return

    parsed = event.get("parsedJson", {})
    handler = _HANDLERS.get(event_key)
    if handler:
        try:
            handler(supabase, parsed)
        except Exception:
            logger.exception(
                "Side-effect handler failed for %s (tx=%s)",
                event_key,
                event.get("id", {}).get("txDigest", "unknown"),
            )


# ──────────────── Main polling loop ──────────────────────────────────


async def poll_events(supabase: Any, onechain_rpc_url: str) -> None:
    """
    Long-running background task that polls for escrow events
    every ``POLL_INTERVAL_SECONDS`` seconds.

    Runs indefinitely until cancelled.  Each event type is polled
    independently with its own cursor for reliable catch-up.
    """
    logger.info(
        "Event indexer started (interval=%.1fs, package=%s)",
        POLL_INTERVAL_SECONDS,
        _PACKAGE_ID,
    )

    if not _PACKAGE_ID:
        logger.warning(
            "ESCROW_PACKAGE_ID is empty — event indexer will not poll"
        )
        # Still keep the coroutine alive so the task handle is valid
        while True:
            await asyncio.sleep(60)

    while True:
        for event_key, event_type in EVENT_TYPES.items():
            try:
                cursor = _load_cursor(supabase, event_key)
                result = await query_events(
                    rpc_url=onechain_rpc_url,
                    event_type=event_type,
                    cursor=cursor,
                    limit=50,
                    descending=False,
                )

                events = result.get("data", [])
                next_cursor = result.get("nextCursor")

                for ev in events:
                    _process_event(supabase, ev, event_key)

                # Persist the cursor even if no events came back,
                # as long as the RPC provided one
                if next_cursor:
                    _save_cursor(supabase, event_key, next_cursor)

                if events:
                    logger.info(
                        "Indexed %d %s event(s)", len(events), event_key
                    )

            except asyncio.CancelledError:
                logger.info("Event indexer received cancellation")
                raise
            except Exception:
                logger.exception(
                    "Error polling %s events", event_key
                )

        await asyncio.sleep(POLL_INTERVAL_SECONDS)
