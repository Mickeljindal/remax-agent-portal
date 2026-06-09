-- Switch from RECO-based login to email+password.
-- Add phone column for agents to fill in their contact number.

-- 1) Add phone column to agents.
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS phone text;

-- 2) Make reco_number nullable (it's no longer the login key — just optional metadata).
ALTER TABLE public.agents ALTER COLUMN reco_number DROP NOT NULL;

-- 3) Admin email notification settings: per-usecase toggles & frequency.
--    Extends the existing portal_settings approach.
INSERT INTO public.portal_settings (key, value) VALUES
  ('notification_rules', '{
    "booking_reminder_enabled": true,
    "booking_reminder_hours_before": [24, 1],
    "signup_notify_admins": true,
    "worksheet_notify_admins": true,
    "course_completion_notify_admins": true
  }')
ON CONFLICT (key) DO NOTHING;
