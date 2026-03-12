CREATE TABLE public.base_overheads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    insurance_monthly INTEGER DEFAULT 0,
    vehicle_monthly INTEGER DEFAULT 0,
    tools_equipment_monthly INTEGER DEFAULT 0,
    software_monthly INTEGER DEFAULT 0,
    rent_workspace_monthly INTEGER DEFAULT 0,
    phone_internet_monthly INTEGER DEFAULT 0,
    accounting_monthly INTEGER DEFAULT 0,
    marketing_monthly INTEGER DEFAULT 0,
    training_monthly INTEGER DEFAULT 0,
    other_fixed_monthly INTEGER DEFAULT 0,
    other_fixed_description TEXT,
    income_tax_rate NUMERIC(5,4) DEFAULT 0.20,
    national_insurance_rate NUMERIC(5,4) DEFAULT 0.09,
    vat_registered BOOLEAN DEFAULT FALSE,
    vat_rate NUMERIC(5,4) DEFAULT 0.20,
    corporation_tax_rate NUMERIC(5,4) DEFAULT 0.00,
    working_days_per_week INTEGER DEFAULT 5 CHECK (working_days_per_week BETWEEN 1 AND 7),
    working_weeks_per_year INTEGER DEFAULT 46 CHECK (working_weeks_per_year BETWEEN 1 AND 52),
    working_hours_per_day NUMERIC(4,2) DEFAULT 8.0,
    desired_annual_salary INTEGER DEFAULT 0,
    desired_profit_margin NUMERIC(5,4) DEFAULT 0.20,
    total_monthly_overheads INTEGER GENERATED ALWAYS AS (
        insurance_monthly + vehicle_monthly + tools_equipment_monthly +
        software_monthly + rent_workspace_monthly + phone_internet_monthly +
        accounting_monthly + marketing_monthly + training_monthly + other_fixed_monthly
    ) STORED,
    total_annual_overheads INTEGER GENERATED ALWAYS AS (
        (insurance_monthly + vehicle_monthly + tools_equipment_monthly +
         software_monthly + rent_workspace_monthly + phone_internet_monthly +
         accounting_monthly + marketing_monthly + training_monthly + other_fixed_monthly) * 12
    ) STORED,
    billable_days_per_year INTEGER GENERATED ALWAYS AS (
        working_days_per_week * working_weeks_per_year
    ) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_overheads_user_id ON public.base_overheads(user_id);
CREATE TRIGGER overheads_updated_at BEFORE UPDATE ON public.base_overheads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
