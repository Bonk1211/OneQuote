from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.dependencies import get_current_user, get_supabase

router = APIRouter(prefix="/api/projects", tags=["projects"])


class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    client_name: Optional[str] = Field(None, max_length=200)
    escrow_object_id: Optional[str] = Field(None, max_length=100)
    status: Optional[str] = Field(None, max_length=50)


class MilestoneStatusUpdate(BaseModel):
    """Payload for updating milestone status after on-chain tx."""
    milestone_index: int = Field(..., ge=0)
    status: str = Field(..., max_length=50)
    tx_digest: Optional[str] = Field(None, max_length=200)


def _sync_project_totals(supabase, project_id: str) -> None:
    """Recalculate total_funded_amount and total_released_amount from milestones."""
    ms_resp = (
        supabase.table("milestones")
        .select("status, amount_fiat")
        .eq("project_id", project_id)
        .execute()
    )
    milestones = ms_resp.data or []
    # total_funded = milestones where funds are currently held in escrow
    funded_statuses = {"funded", "release_requested"}
    total_funded = sum(
        m["amount_fiat"] for m in milestones if m["status"] in funded_statuses
    )
    # total_released = milestones where funds have been paid out to contractor
    total_released = sum(
        m["amount_fiat"] for m in milestones if m["status"] == "released"
    )
    supabase.table("projects").update({
        "total_funded_amount": total_funded,
        "total_released_amount": total_released,
    }).eq("id", project_id).execute()


# ─── Public /pay/ routes (must be before /{project_id} to avoid conflict) ────


@router.get("/pay/{access_token}")
async def get_project_by_token(
    access_token: str,
    supabase=Depends(get_supabase),
):
    """Public endpoint — no auth required. Looks up project by client_access_token."""
    resp = (
        supabase.table("projects")
        .select("*, milestones(*)")
        .eq("client_access_token", access_token)
        .single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(404, "Project not found")
    data = resp.data
    data.pop("user_id", None)
    return data


@router.patch("/pay/{access_token}/milestones")
async def update_milestone_status_by_token(
    access_token: str,
    data: MilestoneStatusUpdate,
    supabase=Depends(get_supabase),
):
    """Public endpoint — updates milestone status after a confirmed on-chain tx."""
    allowed_statuses = {"funded", "released", "disputed", "release_requested"}
    if data.status not in allowed_statuses:
        raise HTTPException(400, f"Status must be one of: {allowed_statuses}")

    project_resp = (
        supabase.table("projects")
        .select("id")
        .eq("client_access_token", access_token)
        .single()
        .execute()
    )
    if not project_resp.data:
        raise HTTPException(404, "Project not found")

    project_id = project_resp.data["id"]
    seq = data.milestone_index + 1  # DB is 1-based

    update_payload: dict = {"status": data.status}
    if data.status == "funded" and data.tx_digest:
        update_payload["funded_tx_digest"] = data.tx_digest
    if data.status == "released" and data.tx_digest:
        update_payload["released_tx_digest"] = data.tx_digest

    resp = (
        supabase.table("milestones")
        .update(update_payload)
        .eq("project_id", project_id)
        .eq("sequence_number", seq)
        .execute()
    )
    if not resp.data:
        raise HTTPException(404, "Milestone not found")

    _sync_project_totals(supabase, project_id)
    return resp.data[0]


# ─── Authenticated routes ────────────────────────────────────────────────────


@router.get("/")
async def list_projects(
    user=Depends(get_current_user), supabase=Depends(get_supabase)
):
    resp = (
        supabase.table("projects")
        .select("*")
        .eq("user_id", str(user.id))
        .order("created_at", desc=True)
        .execute()
    )
    return resp.data


@router.get("/{project_id}")
async def get_project(
    project_id: str,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    resp = (
        supabase.table("projects")
        .select("*, milestones(*), quotes(*)")
        .eq("id", project_id)
        .eq("user_id", str(user.id))
        .single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(404, "Project not found")
    return resp.data


@router.patch("/{project_id}/milestones")
async def update_milestone_status(
    project_id: str,
    data: MilestoneStatusUpdate,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Authenticated endpoint — contractor updates milestone status after on-chain tx."""
    allowed_statuses = {"funded", "released", "disputed", "release_requested"}
    if data.status not in allowed_statuses:
        raise HTTPException(400, f"Status must be one of: {allowed_statuses}")

    project_resp = (
        supabase.table("projects")
        .select("id")
        .eq("id", project_id)
        .eq("user_id", str(user.id))
        .single()
        .execute()
    )
    if not project_resp.data:
        raise HTTPException(404, "Project not found")

    seq = data.milestone_index + 1

    update_payload: dict = {"status": data.status}
    if data.tx_digest:
        if data.status == "funded":
            update_payload["funded_tx_digest"] = data.tx_digest
        elif data.status == "released":
            update_payload["released_tx_digest"] = data.tx_digest

    resp = (
        supabase.table("milestones")
        .update(update_payload)
        .eq("project_id", project_id)
        .eq("sequence_number", seq)
        .execute()
    )
    if not resp.data:
        raise HTTPException(404, "Milestone not found")

    _sync_project_totals(supabase, project_id)
    return resp.data[0]


@router.patch("/{project_id}")
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    payload = {k: v for k, v in data.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(400, "No fields to update")

    resp = (
        supabase.table("projects")
        .update(payload)
        .eq("id", project_id)
        .eq("user_id", str(user.id))
        .execute()
    )
    if not resp.data:
        raise HTTPException(404, "Project not found")
    return resp.data[0]
