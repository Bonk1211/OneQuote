"""
Additional Pydantic models for the quotes domain.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class LineItemResponse(BaseModel):
    description: str
    quantity: float
    unit: str
    unit_price: int
    total: int


class MilestoneResponse(BaseModel):
    id: str
    title: str
    description: str
    sequence_number: int
    amount_fiat: int
    status: str


class QuoteResponse(BaseModel):
    """Full quote returned by the API."""

    id: str
    project_id: str
    user_id: str
    title: str
    summary: str
    line_items: list[LineItemResponse] = []
    subtotal: int
    vat_amount: int = 0
    total_amount: int
    currency_code: str = "GBP"

    labor_hours: float = 0.0
    labor_cost: int = 0
    material_cost: int = 0
    overhead_allocation: int = 0
    break_even_amount: int = 0
    profit_amount: int = 0
    profit_margin_percent: float = 0.0
    min_daily_rate: int = 0
    recommended_daily_rate: int = 0
    is_profitable: bool = True

    content_hash: str = ""
    status: str = "draft"
    ai_conversation_id: Optional[str] = None
    ai_model_used: Optional[str] = None

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # Nested relations (populated by Supabase joins)
    milestones: list[MilestoneResponse] = []


class QuoteUpdate(BaseModel):
    """Payload for PATCH updates to a quote."""

    title: Optional[str] = Field(None, min_length=1, max_length=200)
    summary: Optional[str] = Field(None, max_length=2000)
    line_items: Optional[list[LineItemResponse]] = None
    subtotal: Optional[int] = Field(None, ge=0)
    vat_amount: Optional[int] = Field(None, ge=0)
    total_amount: Optional[int] = Field(None, ge=0)
    status: Optional[str] = Field(
        None,
        pattern=r"^(draft|approved|sent|accepted|rejected|expired)$",
    )
    client_name: Optional[str] = Field(None, max_length=200)
    client_email: Optional[str] = Field(None, max_length=320)
    valid_until: Optional[datetime] = None
    notes: Optional[str] = Field(None, max_length=5000)
