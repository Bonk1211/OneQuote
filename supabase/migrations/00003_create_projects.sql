CREATE TYPE project_status AS ENUM (
    'draft', 'quoted', 'accepted', 'escrowed',
    'in_progress', 'completed', 'cancelled', 'disputed'
);

CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    client_name TEXT,
    client_email TEXT,
    client_phone TEXT,
    project_type TEXT,
    description TEXT,
    location TEXT,
    estimated_start_date DATE,
    estimated_end_date DATE,
    estimated_duration_days INTEGER,
    total_quoted_amount INTEGER DEFAULT 0,
    total_funded_amount INTEGER DEFAULT 0,
    total_released_amount INTEGER DEFAULT 0,
    status project_status DEFAULT 'draft',
    escrow_object_id TEXT,
    escrow_tx_digest TEXT,
    client_access_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_escrow_object_id ON public.projects(escrow_object_id);
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
