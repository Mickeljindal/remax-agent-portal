-- ============================================================
-- Course Enhancements & Email Notifications
-- ============================================================

-- 1. Email notification logs table
CREATE TABLE IF NOT EXISTS public.email_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  recipient_name text,
  recipient_agent_id uuid REFERENCES public.agents(id),
  notification_type text NOT NULL, -- 'course_assigned', 'course_completed', 'course_reminder', 'agent_signup', 'agent_activated'
  subject text NOT NULL,
  body text NOT NULL,
  metadata jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

-- 2. Course certificates table (server-side record)
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

-- 3. Add unique constraint on course_progress for upsert
ALTER TABLE public.course_progress
  DROP CONSTRAINT IF EXISTS course_progress_agent_module_unique;
ALTER TABLE public.course_progress
  ADD CONSTRAINT course_progress_agent_module_unique UNIQUE (agent_id, module_id);

-- 4. Notification preferences for agents
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS notify_course_assigned boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_course_completed boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_reminders boolean DEFAULT true;

-- 5. Admin notification settings
CREATE TABLE IF NOT EXISTS public.admin_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  notify_agent_signup boolean DEFAULT true,
  notify_course_completion boolean DEFAULT true,
  notify_support_ticket boolean DEFAULT true,
  email_override text, -- if null, uses agent.email
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(admin_user_id)
);

-- 6. RLS policies
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notification_settings ENABLE ROW LEVEL SECURITY;

-- Admins can see all notifications
CREATE POLICY "Admins can view all notifications"
  ON public.email_notifications FOR SELECT
  USING (public.has_role('admin', auth.uid()));

-- Agents can see their own notifications
CREATE POLICY "Agents can view own notifications"
  ON public.email_notifications FOR SELECT
  USING (recipient_agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

-- Certificates: agents see own, admins see all
CREATE POLICY "Agents can view own certificates"
  ON public.course_certificates FOR SELECT
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all certificates"
  ON public.course_certificates FOR SELECT
  USING (public.has_role('admin', auth.uid()));

CREATE POLICY "Admins can insert certificates"
  ON public.course_certificates FOR INSERT
  WITH CHECK (public.has_role('admin', auth.uid()) OR agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

-- Admin notification settings
CREATE POLICY "Admins manage own settings"
  ON public.admin_notification_settings FOR ALL
  USING (admin_user_id = auth.uid());

-- Allow service role to insert notifications (edge functions)
CREATE POLICY "Service role can insert notifications"
  ON public.email_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update notifications"
  ON public.email_notifications FOR UPDATE
  USING (true);
