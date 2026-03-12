from pydantic import BaseModel
from typing import Optional


class OverheadUpdate(BaseModel):
    insurance_monthly: Optional[int] = None
    vehicle_monthly: Optional[int] = None
    tools_equipment_monthly: Optional[int] = None
    software_monthly: Optional[int] = None
    rent_workspace_monthly: Optional[int] = None
    phone_internet_monthly: Optional[int] = None
    accounting_monthly: Optional[int] = None
    marketing_monthly: Optional[int] = None
    training_monthly: Optional[int] = None
    other_fixed_monthly: Optional[int] = None
    other_fixed_description: Optional[str] = None
    income_tax_rate: Optional[float] = None
    national_insurance_rate: Optional[float] = None
    vat_registered: Optional[bool] = None
    vat_rate: Optional[float] = None
    working_days_per_week: Optional[int] = None
    working_weeks_per_year: Optional[int] = None
    working_hours_per_day: Optional[float] = None
    desired_annual_salary: Optional[int] = None
    desired_profit_margin: Optional[float] = None
