-- Add "Book with Aman" and "Book with Gurv" to the Support booking links.
-- These are contact-style entries (no Calendly URL): agents get Email / WhatsApp
-- buttons instead of a booking link. Phone numbers drive the WhatsApp link;
-- emails can be added later in Admin Panel > Booking Links.
--
-- This appends to the existing links array (preserving current entries) and is
-- idempotent: re-running won't create duplicates.

UPDATE public.portal_settings
SET value = jsonb_set(
      value,
      '{links}',
      COALESCE(value->'links', '[]'::jsonb) || '[
        { "label": "Book with Aman", "phone": "+1 (416) 520-3462", "email": "", "url": "", "note": "Email or message to request a meeting" },
        { "label": "Book with Gurv", "phone": "+1 (416) 910-9411", "email": "", "url": "", "note": "Email or message to request a meeting" }
      ]'::jsonb
    ),
    updated_at = now()
WHERE key = 'booking_links'
  AND NOT (COALESCE(value->'links', '[]'::jsonb) @> '[{"label": "Book with Aman"}]')
  AND NOT (COALESCE(value->'links', '[]'::jsonb) @> '[{"label": "Book with Gurv"}]');
