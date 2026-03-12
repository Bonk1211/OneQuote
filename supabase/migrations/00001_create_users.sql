CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    business_name TEXT,
    business_type TEXT CHECK (business_type IN (
        'sole_trader', 'limited_company', 'partnership', 'freelancer', 'other'
    )),
    trade_category TEXT,
    country_code TEXT DEFAULT 'GB',
    currency_code TEXT DEFAULT 'GBP',
    onechain_address TEXT,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_onechain_address ON public.users(onechain_address);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
