from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.dependencies import get_current_user, get_supabase
from app.utils.supabase_helpers import safe_maybe_single

router = APIRouter(prefix="/api/users", tags=["users"])


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    business_name: Optional[str] = None
    business_type: Optional[str] = None
    trade_category: Optional[str] = None
    currency_code: Optional[str] = None


@router.get("/me")
async def get_profile(
    user=Depends(get_current_user), supabase=Depends(get_supabase)
):
    resp = safe_maybe_single(
        supabase.table("users")
        .select("*")
        .eq("id", str(user.id))
        .maybe_single()
    )
    return resp.data or {"id": user.id, "onechain_address": user.onechain_address}


@router.put("/me")
async def update_profile(
    data: UserProfileUpdate,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    payload = {k: v for k, v in data.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(400, "No fields to update")

    resp = (
        supabase.table("users")
        .update(payload)
        .eq("id", str(user.id))
        .execute()
    )
    if not resp.data:
        raise HTTPException(404, "User not found")
    return resp.data[0]
