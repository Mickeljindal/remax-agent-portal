-- Booking links (Calendly etc.) shown under the Support section, admin-managed.
INSERT INTO public.portal_settings (key, value) VALUES
  ('booking_links', '{
    "title": "Book a 1-on-1 meeting",
    "subtitle": "Pick a time that works for you",
    "links": [
      { "label": "Book with Shizu", "url": "https://calendly.com/shizu-remaxex", "note": "" },
      { "label": "Book with Gurpreet", "url": "https://calendly.com/hr-remaxex/30min", "note": "Mention Boldtrail 1-on-1" }
    ]
  }')
ON CONFLICT (key) DO NOTHING;

-- Route new support tickets to a configurable inbox (defaults to Shizu).
UPDATE public.portal_settings
  SET value = value || '{"support_inbox_email": "shizu@remaxex.com"}'::jsonb,
      updated_at = now()
  WHERE key = 'email_settings';
