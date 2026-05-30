-- ============================================================
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- https://supabase.com/dashboard/project/lggaxjzazyqdizngupst/sql
-- ============================================================

-- 1. Email notification logs
CREATE TABLE IF NOT EXISTS public.email_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  recipient_name text,
  recipient_agent_id uuid REFERENCES public.agents(id),
  notification_type text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  metadata jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

-- 2. Course certificates
CREATE TABLE IF NOT EXISTS public.course_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id),
  course_id uuid NOT NULL REFERENCES public.courses(id),
  certificate_number text NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  agent_name text NOT NULL,
  reco_number text NOT NULL,
  course_title text NOT NULL,
  total_watch_time_seconds integer DEFAULT 0,
  UNIQUE(agent_id, course_id)
);

-- 3. Unique constraint on course_progress for upsert
ALTER TABLE public.course_progress
  DROP CONSTRAINT IF EXISTS course_progress_agent_module_unique;
ALTER TABLE public.course_progress
  ADD CONSTRAINT course_progress_agent_module_unique UNIQUE (agent_id, module_id);

-- 4. Admin notification settings
CREATE TABLE IF NOT EXISTS public.admin_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  notify_agent_signup boolean DEFAULT true,
  notify_course_completion boolean DEFAULT true,
  notify_support_ticket boolean DEFAULT true,
  email_override text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(admin_user_id)
);

-- 5. Properties table
CREATE TABLE IF NOT EXISTS public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  address text NOT NULL,
  city text,
  province text DEFAULT 'Ontario',
  postal_code text,
  property_type text NOT NULL DEFAULT 'Residential',
  listing_type text NOT NULL DEFAULT 'Sale',
  price numeric,
  bedrooms integer,
  bathrooms numeric,
  square_feet integer,
  lot_size text,
  year_built integer,
  description text,
  features text[],
  mls_number text,
  status text NOT NULL DEFAULT 'Active',
  thumbnail_url text,
  gallery_urls jsonb DEFAULT '[]',
  assigned_agent_id uuid REFERENCES public.agents(id),
  created_by text NOT NULL,
  is_active boolean DEFAULT true,
  listed_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. In-app notifications
CREATE TABLE IF NOT EXISTS public.in_app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id),
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'info',
  link text,
  is_read boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_agent
  ON public.in_app_notifications(agent_id, is_read, created_at DESC);

-- 7. Event enhancements
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS max_attendees integer,
  ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurrence_rule text,
  ADD COLUMN IF NOT EXISTS notify_agents boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_hours_before integer DEFAULT 24;

-- 8. Event notifications
CREATE TABLE IF NOT EXISTS public.event_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.agents(id),
  notification_type text NOT NULL DEFAULT 'reminder',
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, agent_id, notification_type)
);

-- 9. Pre-con tags
CREATE TABLE IF NOT EXISTS public.precon_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text DEFAULT 'blue',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.precon_project_tags (
  project_id uuid NOT NULL REFERENCES public.precon_projects(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.precon_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, tag_id)
);

-- 10. Property types (configurable)
CREATE TABLE IF NOT EXISTS public.precon_property_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 11. Sales statuses (configurable)
CREATE TABLE IF NOT EXISTS public.precon_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text DEFAULT 'blue',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 12. Add columns to precon_projects
ALTER TABLE public.precon_projects
  ADD COLUMN IF NOT EXISTS is_new boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- 13. Add columns to agents
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS notify_course_assigned boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_course_completed boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_reminders boolean DEFAULT true;

-- 14. Add storage_path to course_modules
ALTER TABLE public.course_modules
  ADD COLUMN IF NOT EXISTS storage_path text;

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO public.precon_tags (name, color, sort_order) VALUES
  ('New', 'red', 0), ('Featured', 'amber', 1), ('Hot', 'orange', 2),
  ('Exclusive', 'purple', 3), ('VIP Access', 'indigo', 4)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.precon_property_types (name, sort_order) VALUES
  ('Condo', 0), ('Townhome', 1), ('Home', 2), ('Mixed / All', 3),
  ('Commercial', 4), ('Stacked Townhome', 5)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.precon_statuses (name, color, sort_order) VALUES
  ('Now Selling', 'green', 0), ('Coming Soon', 'amber', 1),
  ('Active', 'blue', 2), ('Ready', 'emerald', 3),
  ('Sold Out', 'gray', 4), ('Registration Open', 'purple', 5)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precon_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precon_project_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precon_property_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precon_statuses ENABLE ROW LEVEL SECURITY;

-- Properties
CREATE POLICY "Anyone authenticated can view active properties" ON public.properties FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage properties" ON public.properties FOR ALL USING (public.has_role('admin', auth.uid()));

-- In-app notifications
CREATE POLICY "Agents see own notifications" ON public.in_app_notifications FOR SELECT USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));
CREATE POLICY "Agents update own notifications" ON public.in_app_notifications FOR UPDATE USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));
CREATE POLICY "System can insert notifications" ON public.in_app_notifications FOR INSERT WITH CHECK (true);

-- Email notifications
CREATE POLICY "Admins view all email notifications" ON public.email_notifications FOR SELECT USING (public.has_role('admin', auth.uid()));
CREATE POLICY "Agents view own email notifications" ON public.email_notifications FOR SELECT USING (recipient_agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));
CREATE POLICY "Insert email notifications" ON public.email_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Update email notifications" ON public.email_notifications FOR UPDATE USING (true);

-- Certificates
CREATE POLICY "Agents view own certificates" ON public.course_certificates FOR SELECT USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));
CREATE POLICY "Admins view all certificates" ON public.course_certificates FOR SELECT USING (public.has_role('admin', auth.uid()));
CREATE POLICY "Insert certificates" ON public.course_certificates FOR INSERT WITH CHECK (true);

-- Admin notification settings
CREATE POLICY "Admins manage own settings" ON public.admin_notification_settings FOR ALL USING (admin_user_id = auth.uid());

-- Event notifications
CREATE POLICY "Agents see own event notifications" ON public.event_notifications FOR SELECT USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));
CREATE POLICY "Admins manage event notifications" ON public.event_notifications FOR ALL USING (public.has_role('admin', auth.uid()));

-- Pre-con tags & categories (everyone reads, admins write)
CREATE POLICY "Anyone reads tags" ON public.precon_tags FOR SELECT USING (true);
CREATE POLICY "Anyone reads project_tags" ON public.precon_project_tags FOR SELECT USING (true);
CREATE POLICY "Anyone reads property_types" ON public.precon_property_types FOR SELECT USING (true);
CREATE POLICY "Anyone reads statuses" ON public.precon_statuses FOR SELECT USING (true);
CREATE POLICY "Admins manage tags" ON public.precon_tags FOR ALL USING (public.has_role('admin', auth.uid()));
CREATE POLICY "Admins manage project_tags" ON public.precon_project_tags FOR ALL USING (public.has_role('admin', auth.uid()));
CREATE POLICY "Admins manage property_types" ON public.precon_property_types FOR ALL USING (public.has_role('admin', auth.uid()));
CREATE POLICY "Admins manage statuses" ON public.precon_statuses FOR ALL USING (public.has_role('admin', auth.uid()));

-- ============================================================
-- STORAGE BUCKETS (run separately if these fail)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('course-videos', 'course-videos', true, 524288000, ARRAY['video/mp4','video/webm','video/quicktime','video/x-msvideo'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('property-images', 'property-images', true, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('precon-images', 'precon-images', true, 15728640, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;
