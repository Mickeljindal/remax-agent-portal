-- Store the uploaded client ID image so admins can view it in the portal
-- (previously the image was only sent as an email attachment, not stored).
ALTER TABLE public.precon_worksheets
  ADD COLUMN IF NOT EXISTS id_attachment_url text;
