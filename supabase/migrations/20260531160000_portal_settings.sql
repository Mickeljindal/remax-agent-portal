-- Generic key/value portal settings (admin-controlled) — e.g. listings per page
CREATE TABLE IF NOT EXISTS public.portal_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated reads portal settings"
  ON public.portal_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage portal settings"
  ON public.portal_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Default: show 6 listings per page on the agent dashboard
INSERT INTO public.portal_settings (key, value) VALUES
  ('listings_pagination', '{"page_size": 6, "enabled": true}')
ON CONFLICT (key) DO NOTHING;
