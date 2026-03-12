CREATE TYPE milestone_status AS ENUM (
    'pending', 'funded', 'in_progress', 'release_requested',
    'released', 'disputed', 'refunded'
);

CREATE TABLE public.milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    sequence_number INTEGER NOT NULL,
    amount_fiat INTEGER NOT NULL,
    amount_usdc BIGINT,
    estimated_completion DATE,
    status milestone_status DEFAULT 'pending',
    on_chain_index INTEGER,
    funded_tx_digest TEXT,
    released_tx_digest TEXT,
    dispute_tx_digest TEXT,
    description_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_milestones_project_id ON public.milestones(project_id);
CREATE TRIGGER milestones_updated_at BEFORE UPDATE ON public.milestones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
