-- Buyer Presentation Kit items (admin-managed, agents view/download)
CREATE TABLE IF NOT EXISTS public.buyer_kit_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  icon text DEFAULT 'file',          -- lucide icon key: file, presentation, image, mic, briefcase
  file_url text,                      -- uploaded file (KloudBean server) OR external link
  link_url text,
  file_name text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.buyer_kit_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated views active buyer kit"
  ON public.buyer_kit_items FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins manage buyer kit"
  ON public.buyer_kit_items FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed defaults (no files yet — admin attaches later)
INSERT INTO public.buyer_kit_items (title, description, icon, sort_order) VALUES
  ('Buyer consultation deck', 'Slide outline: needs, financing, search criteria, offer process.', 'presentation', 0),
  ('Buyer agency & forms', 'RECO-compliant buyer rep checklist and signable PDFs.', 'file', 1),
  ('Neighbourhood one-pagers', 'Schools, transit, and amenities templates per district.', 'image', 2),
  ('Objection handlers', 'Scripts for price, timing, and competing offers.', 'mic', 3)
ON CONFLICT DO NOTHING;
