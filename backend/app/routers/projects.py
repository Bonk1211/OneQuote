from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user, get_supabase

router = APIRouter(prefix="/api/projects", tags=["projects"])


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
