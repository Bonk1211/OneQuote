import pytest

from app.services.profitability import calculate_profitability


@pytest.fixture
def standard_overheads():
    return {
        "income_tax_rate": "0.2000",
        "national_insurance_rate": "0.0900",
        "desired_annual_salary": 4000000,  # 40,000 in pence
        "total_annual_overheads": 1200000,  # 12,000 in pence
        "billable_days_per_year": 230,
        "working_hours_per_day": "8.00",
        "desired_profit_margin": "0.2000",
    }


def test_profitable_quote(standard_overheads):
    result = calculate_profitability(
        quote_subtotal=150000,  # 1500
        labor_hours=16,
        material_cost=20000,  # 200
        project_duration_days=2,
        overheads=standard_overheads,
    )
    assert result.is_profitable is True
    assert result.profit_margin_percent > 0
    assert len(result.warnings) == 0 or all(
        "below" not in w.lower() for w in result.warnings if "LOSE" in w
    )


def test_unprofitable_quote(standard_overheads):
    result = calculate_profitability(
        quote_subtotal=10000,  # 100 - way too low
        labor_hours=16,
        material_cost=5000,
        project_duration_days=2,
        overheads=standard_overheads,
    )
    assert result.is_profitable is False
    assert any("LOSE money" in w for w in result.warnings)


def test_zero_duration(standard_overheads):
    result = calculate_profitability(
        quote_subtotal=50000,
        labor_hours=0,
        material_cost=10000,
        project_duration_days=0,
        overheads=standard_overheads,
    )
    assert result.overhead_allocation == 0


def test_min_daily_rate_calculation(standard_overheads):
    result = calculate_profitability(
        quote_subtotal=100000,
        labor_hours=8,
        material_cost=0,
        project_duration_days=1,
        overheads=standard_overheads,
    )
    # min_daily_rate = (1200000 + 40000000/0.71) / 230
    assert result.min_daily_rate > 0
    assert result.labor_cost > 0
