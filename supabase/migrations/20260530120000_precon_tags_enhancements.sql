-- ============================================================
-- Pre-Con Listings: Tags, Categories, Enhanced Management
-- ============================================================

-- 1. Tags table for flexible labeling
CREATE TABLE IF NOT EXISTS public.precon_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text DEFAULT 'blue', -- tailwind color name: blue, red, green, amber, etc.
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Junction table: projects <-> tags (many-to-many)
CREATE TABLE IF NOT EXISTS public.precon_project_tags (
  project_id uuid NOT NULL REFERENCES public.precon_projects(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.precon_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, tag_id)
);

-- 3. Property type categories (beyond the basic enum)
CREATE TABLE IF NOT EXISTS public.precon_property_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Sales status options (configurable)
CREATE TABLE IF NOT EXISTS public.precon_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text DEFAULT 'blue',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Add is_new and is_featured flags to projects
ALTER TABLE public.precon_projects
  ADD COLUMN IF NOT EXISTS is_new boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- 6. Seed default tags
INSERT INTO public.precon_tags (name, color, sort_order) VALUES
  ('New', 'red', 0),
  ('Featured', 'amber', 1),
  ('Hot', 'orange', 2),
  ('Exclusive', 'purple', 3),
  ('VIP Access', 'indigo', 4)
ON CONFLICT (name) DO NOTHING;

-- 7. Seed default property types
INSERT INTO public.precon_property_types (name, sort_order) VALUES
  ('Condo', 0),
  ('Townhome', 1),
  ('Home', 2),
  ('Mixed / All', 3),
  ('Commercial', 4),
  ('Stacked Townhome', 5)
ON CONFLICT (name) DO NOTHING;

-- 8. Seed default statuses
INSERT INTO public.precon_statuses (name, color, sort_order) VALUES
  ('Now Selling', 'green', 0),
  ('Coming Soon', 'amber', 1),
  ('Active', 'blue', 2),
  ('Ready', 'emerald', 3),
  ('Sold Out', 'gray', 4),
  ('Registration Open', 'purple', 5)
ON CONFLICT (name) DO NOTHING;

-- 9. RLS
ALTER TABLE public.precon_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precon_project_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precon_property_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precon_statuses ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "Anyone can read tags" ON public.precon_tags FOR SELECT USING (true);
CREATE POLICY "Anyone can read project_tags" ON public.precon_project_tags FOR SELECT USING (true);
CREATE POLICY "Anyone can read property_types" ON public.precon_property_types FOR SELECT USING (true);
CREATE POLICY "Anyone can read statuses" ON public.precon_statuses FOR SELECT USING (true);

-- Admins can manage
CREATE POLICY "Admins manage tags" ON public.precon_tags FOR ALL USING (public.has_role('admin', auth.uid()));
CREATE POLICY "Admins manage project_tags" ON public.precon_project_tags FOR ALL USING (public.has_role('admin', auth.uid()));
CREATE POLICY "Admins manage property_types" ON public.precon_property_types FOR ALL USING (public.has_role('admin', auth.uid()));
CREATE POLICY "Admins manage statuses" ON public.precon_statuses FOR ALL USING (public.has_role('admin', auth.uid()));

-- 10. Storage bucket for precon images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'precon-images',
  'precon-images',
  true,
  15728640, -- 15MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view precon images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'precon-images');

CREATE POLICY "Admins can upload precon images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'precon-images' AND public.has_role('admin', auth.uid()));

CREATE POLICY "Admins can delete precon images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'precon-images' AND public.has_role('admin', auth.uid()));
