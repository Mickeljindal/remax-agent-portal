-- ─────────────────────────────────────────────────────────────────────────
--  Admin controls: section ordering, per-office booking emails, support
--  categories. Follows the existing portal_settings / has_role() patterns.
-- ─────────────────────────────────────────────────────────────────────────

-- 1) Per-office notification email for room-booking inquiries.
ALTER TABLE public.office_locations
  ADD COLUMN IF NOT EXISTS notification_email text;

-- Seed the two known offices' inbound inquiry addresses (only if not already set).
UPDATE public.office_locations
  SET notification_email = 'shizu@remaxex.com'
  WHERE notification_email IS NULL AND name ILIKE '%mississauga%';

UPDATE public.office_locations
  SET notification_email = 'info@remaxex.com'
  WHERE notification_email IS NULL AND name ILIKE '%brampton%';

-- 2) Default agent-portal section order (admins can reorder from settings).
INSERT INTO public.portal_settings (key, value) VALUES
  ('section_order', '{"order": ["dashboard", "courses", "precon", "vendors", "support", "offices"]}')
ON CONFLICT (key) DO NOTHING;

-- 3) Admin-managed support categories ("tabs"): Marketing, Vendors, etc.
CREATE TABLE IF NOT EXISTS public.support_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated reads support categories" ON public.support_categories;
CREATE POLICY "Anyone authenticated reads support categories"
  ON public.support_categories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage support categories" ON public.support_categories;
CREATE POLICY "Admins manage support categories"
  ON public.support_categories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed the default categories (matching what was previously hardcoded, plus Vendors).
INSERT INTO public.support_categories (key, label, description, sort_order) VALUES
  ('general',   'General',         'General questions and help',            0),
  ('marketing', 'Marketing Support', 'Listings, social, branded materials', 1),
  ('tech',      'Tech Support',    'Portal, logins, technical issues',      2),
  ('vendors',   'Vendors',         'Approved vendors and trade services',   3),
  ('billing',   'Billing',         'Invoices, commissions, payments',       4),
  ('training',  'Training',        'Courses, certifications, onboarding',   5)
ON CONFLICT (key) DO NOTHING;
