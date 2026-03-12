from pydantic import BaseModel
from typing import Optional


class EscrowCreateRequest(BaseModel):
    project_id: str


class FundMilestoneRequest(BaseModel):
    escrow_object_id: str
    milestone_index: int


class ReleaseRequest(BaseModel):
    escrow_object_id: str
    milestone_index: int


class DisputeRequest(BaseModel):
    escrow_object_id: str
    milestone_index: int


class SignedTxPayload(BaseModel):
    digest: str
    signature: str


class SponsoredTxResponse(BaseModel):
    transaction_bytes: str
    digest: str
