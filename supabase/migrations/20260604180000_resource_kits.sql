-- Generic resource kits (Listing Presentation Kit, Agent Success Kit, etc.)
-- One table keyed by `kit` so we can add more kits without new tables.
CREATE TABLE IF NOT EXISTS public.resource_kit_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit text NOT NULL,                  -- 'listing' | 'success' | ...
  title text NOT NULL,
  description text,
  icon text DEFAULT 'file',           -- lucide key: file, presentation, image, mic, briefcase, folder, link
  file_url text,                      -- uploaded file (server) OR external link
  link_url text,
  file_name text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.resource_kit_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated views active resource kits" ON public.resource_kit_items;
CREATE POLICY "Anyone authenticated views active resource kits"
  ON public.resource_kit_items FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage resource kits" ON public.resource_kit_items;
CREATE POLICY "Admins manage resource kits"
  ON public.resource_kit_items FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS resource_kit_items_kit_idx ON public.resource_kit_items (kit, sort_order);

-- Seed: Listing Presentation Kit
INSERT INTO public.resource_kit_items (kit, title, description, icon, sort_order) VALUES
  ('listing', 'Listing presentation deck', 'Slide outline: pricing strategy, marketing plan, and timeline.', 'presentation', 0),
  ('listing', 'Comparative market analysis (CMA) template', 'Branded CMA template to prepare for the listing appointment.', 'file', 1),
  ('listing', 'Pre-listing package', 'What to send sellers before the appointment.', 'file', 2),
  ('listing', 'Seller objection handlers', 'Scripts for commission, pricing, and timing.', 'mic', 3)
ON CONFLICT DO NOTHING;

-- Seed: Agent Success Kit (scripts, social designs, content bank link)
INSERT INTO public.resource_kit_items (kit, title, description, icon, link_url, sort_order) VALUES
  ('success', 'RE/MAX Social Media Content Bank', 'Branded social shareables — open the shared folder.', 'folder',
   'https://www.dropbox.com/scl/fo/7nb26gxt1sa3ms5pd9g51/AEAkpr8vzAFHAYmaXZSdXQg?rlkey=c5ceqhexmrdjj3ftxnvhim7s5&rmxv=1647608794&dl=0', 0)
ON CONFLICT DO NOTHING;

INSERT INTO public.resource_kit_items (kit, title, description, icon, sort_order) VALUES
  ('success', 'Prospecting scripts', 'Cold call, door-knock, and follow-up scripts.', 'mic', 1),
  ('success', 'Social media post templates', 'Ready-to-edit caption + design templates.', 'image', 2)
ON CONFLICT DO NOTHING;

-- Section headings for the two new kits (admin can rename)
INSERT INTO public.section_labels (section_key, title, subtitle) VALUES
  ('listing-kit', 'Listing presentation kit', 'Everything you need to win the listing appointment'),
  ('success-kit', 'Agent success kit', 'Scripts, social media designs, and the content bank')
ON CONFLICT (section_key) DO NOTHING;
