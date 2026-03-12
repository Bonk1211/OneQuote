from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user, get_supabase
from app.models.escrow import (
    EscrowCreateRequest,
    FundMilestoneRequest,
    ReleaseRequest,
    DisputeRequest,
    SponsoredTxResponse,
)

router = APIRouter(prefix="/api/escrow", tags=["escrow"])


@router.post("/create", response_model=SponsoredTxResponse)
async def create_escrow(
    payload: EscrowCreateRequest,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    # Fetch project + milestones
    project = (
        supabase.table("projects")
        .select("*, milestones(*), quotes(content_hash)")
        .eq("id", payload.project_id)
        .eq("user_id", str(user.id))
        .single()
        .execute()
    )
    if not project.data:
        raise HTTPException(404, "Project not found")

    # TODO: Build OneChain TransactionBlock with create_escrow Move call
    # For now, return placeholder
    raise HTTPException(
        501, "Escrow creation will be implemented after OneChain SDK integration"
    )


@router.post("/fund", response_model=SponsoredTxResponse)
async def fund_milestone(
    payload: FundMilestoneRequest,
    user=Depends(get_current_user),
):
    raise HTTPException(
        501, "Fund milestone will be implemented after OneChain SDK integration"
    )


@router.post("/request-release", response_model=SponsoredTxResponse)
async def request_release(
    payload: ReleaseRequest,
    user=Depends(get_current_user),
):
    raise HTTPException(
        501, "Request release will be implemented after OneChain SDK integration"
    )


@router.post("/release", response_model=SponsoredTxResponse)
async def release_milestone(
    payload: ReleaseRequest,
    user=Depends(get_current_user),
):
    raise HTTPException(
        501, "Release will be implemented after OneChain SDK integration"
    )


@router.post("/dispute", response_model=SponsoredTxResponse)
async def dispute_milestone(
    payload: DisputeRequest,
    user=Depends(get_current_user),
):
    raise HTTPException(
        501, "Dispute will be implemented after OneChain SDK integration"
    )
