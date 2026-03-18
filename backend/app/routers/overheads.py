from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user, get_supabase
from app.models.overhead import OverheadUpdate
from app.utils.supabase_helpers import safe_maybe_single

router = APIRouter(prefix="/api/overheads", tags=["overheads"])


@router.get("/")
async def get_overheads(
    user=Depends(get_current_user), supabase=Depends(get_supabase)
):
    resp = safe_maybe_single(
        supabase.table("base_overheads")
        .select("*")
        .eq("user_id", str(user.id))
        .maybe_single()
    )
    return resp.data or {}


@router.put("/")
async def upsert_overheads(
    data: OverheadUpdate,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    payload = {k: v for k, v in data.model_dump().items() if v is not None}
    payload["user_id"] = str(user.id)

    resp = (
        supabase.table("base_overheads")
        .upsert(payload, on_conflict="user_id")
        .execute()
    )
    return resp.data[0] if resp.data else {}
