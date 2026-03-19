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
