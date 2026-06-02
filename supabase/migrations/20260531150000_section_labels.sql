-- Admin-editable labels for agent-portal section headings (title + subtitle)
CREATE TABLE IF NOT EXISTS public.section_labels (
  section_key text PRIMARY KEY,
  title text,
  subtitle text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.section_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated reads section labels"
  ON public.section_labels FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage section labels"
  ON public.section_labels FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
