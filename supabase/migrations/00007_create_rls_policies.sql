ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.base_overheads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own profile" ON public.users FOR ALL
    USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users own overheads" ON public.base_overheads FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own projects" ON public.projects FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own quotes" ON public.quotes FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own milestones" ON public.milestones FOR ALL
    USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

CREATE POLICY "Users view own events" ON public.escrow_events FOR SELECT
    USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.milestones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.escrow_events;
