CREATE TABLE public.escrow_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    tx_digest TEXT NOT NULL,
    event_seq INTEGER NOT NULL,
    escrow_object_id TEXT NOT NULL,
    package_id TEXT NOT NULL,
    event_data JSONB NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    milestone_index INTEGER,
    sender_address TEXT,
    timestamp_ms BIGINT,
    checkpoint BIGINT,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_escrow_events_unique ON public.escrow_events(tx_digest, event_seq);
CREATE INDEX idx_escrow_events_escrow_object ON public.escrow_events(escrow_object_id);
CREATE INDEX idx_escrow_events_unprocessed ON public.escrow_events(processed) WHERE processed = FALSE;
