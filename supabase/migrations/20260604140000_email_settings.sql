-- Admin-manageable email settings (stored in portal_settings).
-- These override the env-var defaults when set, so admins control all addresses from the UI.
INSERT INTO public.portal_settings (key, value) VALUES
  ('email_settings', '{
    "from_email": "noreply@agents.updates.joinremaxex.com",
    "portal_name": "RE/MAX Excellence Portal",
    "worksheet_admin_email": "info@remaxex.com",
    "worksheet_from_email": "noreply@agents.updates.joinremaxex.com"
  }')
ON CONFLICT (key) DO NOTHING;
