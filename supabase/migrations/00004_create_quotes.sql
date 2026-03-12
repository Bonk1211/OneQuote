CREATE TYPE quote_status AS ENUM (
    'generating', 'draft', 'approved', 'sent', 'accepted', 'rejected', 'expired'
);

CREATE TABLE public.quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    version INTEGER DEFAULT 1,
    title TEXT NOT NULL,
    summary TEXT,
    line_items JSONB DEFAULT '[]'::JSONB,
    subtotal INTEGER DEFAULT 0,
    vat_amount INTEGER DEFAULT 0,
    total_amount INTEGER DEFAULT 0,
    currency_code TEXT DEFAULT 'GBP',
    labor_hours NUMERIC(8,2),
    labor_cost INTEGER,
    material_cost INTEGER,
    overhead_allocation INTEGER,
    break_even_amount INTEGER,
    profit_amount INTEGER,
    profit_margin_percent NUMERIC(5,2),
    min_daily_rate INTEGER,
    recommended_daily_rate INTEGER,
    is_profitable BOOLEAN,
    pdf_url TEXT,
    pdf_generated_at TIMESTAMPTZ,
    ai_conversation_id TEXT,
    ai_model_used TEXT,
    ai_raw_response JSONB,
    status quote_status DEFAULT 'draft',
    valid_until DATE,
    content_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quotes_project_id ON public.quotes(project_id);
CREATE INDEX idx_quotes_user_id ON public.quotes(user_id);
CREATE TRIGGER quotes_updated_at BEFORE UPDATE ON public.quotes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
