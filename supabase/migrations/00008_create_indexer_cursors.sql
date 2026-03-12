CREATE TABLE public.indexer_cursors (
    event_key TEXT PRIMARY KEY,
    cursor_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
