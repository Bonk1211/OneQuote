from pydantic import BaseModel, Field
from typing import Optional


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)
    conversation_id: Optional[str] = None
    project_id: Optional[str] = None


class LineItem(BaseModel):
    description: str
    quantity: float
    unit: str
    unit_price: int
    total: int


class ProfitAnalysis(BaseModel):
    labor_hours: float
    labor_cost: int
    material_cost: int
    overhead_allocation: int
    total_cost: int
    break_even_amount: int
    recommended_quote: int
    profit_amount: int
    profit_margin_percent: float
    min_daily_rate: int
    is_profitable: bool
    warnings: list[str]


class ParsedQuote(BaseModel):
    project_type: str
    title: str
    summary: str
    duration_days: int
    line_items: list[LineItem]
    subtotal: int
    vat_amount: int = 0
    total_amount: int
    milestones: list[dict]


class ChatResponse(BaseModel):
    message: str
    parsed_quote: Optional[ParsedQuote] = None
    profit_analysis: Optional[ProfitAnalysis] = None
    conversation_id: str
    requires_clarification: bool = False
    clarification_questions: list[str] = []
