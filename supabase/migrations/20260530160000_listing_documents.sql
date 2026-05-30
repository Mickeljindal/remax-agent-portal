-- Per-listing downloadable documents (project details, price list, floor plans, incentives, presentations)
CREATE TABLE IF NOT EXISTS public.precon_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.precon_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  doc_type text NOT NULL DEFAULT 'general', -- project_details, price_list, floor_plans, incentives, presentation, general
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.precon_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated views active precon documents"
  ON public.precon_documents FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins manage precon documents"
  ON public.precon_documents FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_precon_documents_project ON public.precon_documents(project_id, doc_type, sort_order);

-- Storage bucket for listing PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('precon-documents', 'precon-documents', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "Anyone can view precon documents"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'precon-documents');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can upload precon documents"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'precon-documents' AND public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can delete precon documents"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'precon-documents' AND public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;
