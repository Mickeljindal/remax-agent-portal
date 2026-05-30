-- Brokerage-wide pre-con document library (templates/forms shared across all listings)
CREATE TABLE IF NOT EXISTS public.precon_library_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  icon text DEFAULT '📄',
  file_url text,          -- uploaded file URL (KloudBean server) OR external link
  link_url text,          -- alternative: external Drive/web link
  file_name text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.precon_library_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated views active library docs"
  ON public.precon_library_documents FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins manage library docs"
  ON public.precon_library_documents FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed the default library tiles (empty links — admin attaches files later)
INSERT INTO public.precon_library_documents (title, icon, sort_order) VALUES
  ('Showing Instructions', '📘', 0),
  ('Offer Data Sheet', '📄', 1),
  ('Clauses', '📕', 2),
  ('Schedule B', '📑', 3),
  ('Deal Sheet', '📋', 4)
ON CONFLICT DO NOTHING;
