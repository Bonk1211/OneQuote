from app.models.chat import ProfitAnalysis


def calculate_profitability(
    quote_subtotal: int,
    labor_hours: float,
    material_cost: int,
    project_duration_days: int,
    overheads: dict,
) -> ProfitAnalysis:
    """
    Core profitability engine.
    All monetary values in minor currency units (pence/cents).
    """
    tax_rate = float(overheads.get("income_tax_rate", 0.20))
    ni_rate = float(overheads.get("national_insurance_rate", 0.09))
    net_salary = overheads.get("desired_annual_salary", 0)

    # Gross salary needed to achieve desired net after tax + NI
    deduction_rate = 1 - tax_rate - ni_rate
    gross_salary = (
        int(net_salary / deduction_rate) if deduction_rate > 0 else net_salary
    )

    annual_overheads = overheads.get("total_annual_overheads", 0)
    billable_days = overheads.get("billable_days_per_year", 230)

    # Minimum daily rate to cover overheads + salary
    min_daily_rate = (
        int((annual_overheads + gross_salary) / billable_days)
        if billable_days > 0
        else 0
    )

    # Labor cost for this project
    hours_per_day = float(overheads.get("working_hours_per_day", 8.0))
    min_hourly_rate = int(min_daily_rate / hours_per_day) if hours_per_day > 0 else 0
    labor_cost = int(labor_hours * min_hourly_rate)

    # Overhead allocation proportional to project duration
    daily_overhead = int(annual_overheads / billable_days) if billable_days > 0 else 0
    overhead_allocation = daily_overhead * project_duration_days

    # Total cost = break-even point
    total_cost = labor_cost + material_cost + overhead_allocation
    break_even_amount = total_cost

    # Recommended quote with desired margin
    desired_margin = float(overheads.get("desired_profit_margin", 0.20))
    if desired_margin < 1.0:
        recommended_quote = int(total_cost / (1 - desired_margin))
    else:
        recommended_quote = total_cost

    # Actual profitability of the proposed quote
    profit_amount = quote_subtotal - total_cost
    profit_margin_percent = (
        round((profit_amount / quote_subtotal * 100), 2) if quote_subtotal > 0 else 0.0
    )
    is_profitable = quote_subtotal > break_even_amount

    # Warnings
    warnings: list[str] = []
    if not is_profitable:
        deficit_pct = (
            round(((break_even_amount - quote_subtotal) / break_even_amount) * 100, 1)
            if break_even_amount > 0
            else 0
        )
        warnings.append(
            f"Quote is {deficit_pct}% below break-even. You will LOSE money on this job."
        )
    elif profit_margin_percent < (desired_margin * 100):
        warnings.append(
            f"Profit margin ({profit_margin_percent}%) is below your target ({desired_margin * 100}%)."
        )

    if project_duration_days > 0:
        implied_daily = int(quote_subtotal / project_duration_days)
        if implied_daily < min_daily_rate:
            warnings.append(
                f"Implied day rate ({implied_daily}) is below your minimum sustainable rate ({min_daily_rate})."
            )

    return ProfitAnalysis(
        labor_hours=labor_hours,
        labor_cost=labor_cost,
        material_cost=material_cost,
        overhead_allocation=overhead_allocation,
        total_cost=total_cost,
        break_even_amount=break_even_amount,
        recommended_quote=recommended_quote,
        profit_amount=profit_amount,
        profit_margin_percent=profit_margin_percent,
        min_daily_rate=min_daily_rate,
        is_profitable=is_profitable,
        warnings=warnings,
    )
