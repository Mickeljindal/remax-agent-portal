-- ============================================================
-- Full Portal Features: Properties, Events, Video Storage, Notifications
-- ============================================================

-- ─── 1. PROPERTIES (Admin-managed listings) ─────────────────
CREATE TABLE IF NOT EXISTS public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  address text NOT NULL,
  city text,
  province text DEFAULT 'Ontario',
  postal_code text,
  property_type text NOT NULL DEFAULT 'Residential', -- Residential, Condo, Commercial, Land
  listing_type text NOT NULL DEFAULT 'Sale', -- Sale, Lease
  price numeric,
  bedrooms integer,
  bathrooms numeric,
  square_feet integer,
  lot_size text,
  year_built integer,
  description text,
  features text[], -- array of feature strings
  mls_number text,
  status text NOT NULL DEFAULT 'Active', -- Active, Sold, Pending, Expired
  thumbnail_url text,
  gallery_urls jsonb DEFAULT '[]',
  assigned_agent_id uuid REFERENCES public.agents(id),
  created_by text NOT NULL, -- admin user_id
  is_active boolean DEFAULT true,
  listed_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active properties"
  ON public.properties FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage properties"
  ON public.properties FOR ALL
  USING (public.has_role('admin', auth.uid()));

-- ─── 2. EVENTS ENHANCEMENTS ─────────────────────────────────
-- Add missing columns to events if they don't exist
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS max_attendees integer,
  ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurrence_rule text, -- e.g. 'weekly', 'monthly'
  ADD COLUMN IF NOT EXISTS notify_agents boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_hours_before integer DEFAULT 24;

-- Event notifications log (tracks which agents were notified)
CREATE TABLE IF NOT EXISTS public.event_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.agents(id),
  notification_type text NOT NULL DEFAULT 'reminder', -- 'created', 'reminder', 'updated', 'cancelled'
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, agent_id, notification_type)
);

ALTER TABLE public.event_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents see own event notifications"
  ON public.event_notifications FOR SELECT
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Admins manage event notifications"
  ON public.event_notifications FOR ALL
  USING (public.has_role('admin', auth.uid()));

-- ─── 3. IN-APP NOTIFICATIONS ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.in_app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id),
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'info', -- 'info', 'course', 'event', 'property', 'reminder', 'system'
  link text, -- optional deep link within the app
  is_read boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_in_app_notifications_agent ON public.in_app_notifications(agent_id, is_read, created_at DESC);

ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents see own in-app notifications"
  ON public.in_app_notifications FOR SELECT
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents can update own notifications (mark read)"
  ON public.in_app_notifications FOR UPDATE
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "System can insert notifications"
  ON public.in_app_notifications FOR INSERT
  WITH CHECK (true);

-- ─── 4. STORAGE BUCKETS ─────────────────────────────────────
-- Create storage bucket for course videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-videos',
  'course-videos',
  true,
  524288000, -- 500MB max per file
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for property images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images',
  'property-images',
  true,
  10485760, -- 10MB max per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for course-videos bucket
CREATE POLICY "Anyone can view course videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'course-videos');

CREATE POLICY "Admins can upload course videos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'course-videos' AND public.has_role('admin', auth.uid()));

CREATE POLICY "Admins can delete course videos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'course-videos' AND public.has_role('admin', auth.uid()));

-- Storage policies for property-images bucket
CREATE POLICY "Anyone can view property images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-images');

CREATE POLICY "Admins can upload property images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'property-images' AND public.has_role('admin', auth.uid()));

CREATE POLICY "Admins can delete property images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'property-images' AND public.has_role('admin', auth.uid()));

-- ─── 5. COURSE MODULE VIDEO FILE REFERENCE ──────────────────
-- Add storage_path column to course_modules for uploaded videos
ALTER TABLE public.course_modules
  ADD COLUMN IF NOT EXISTS storage_path text; -- path in course-videos bucket
