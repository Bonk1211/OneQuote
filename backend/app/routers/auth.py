from fastapi import APIRouter, Depends

from app.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/me")
async def get_me(user=Depends(get_current_user)):
    return {"id": user.id, "onechain_address": user.onechain_address}
