-- Per-listing toggle to show/hide the contact phone to agents
ALTER TABLE public.precon_projects
  ADD COLUMN IF NOT EXISTS phone_public boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.precon_projects.phone_public IS 'When false, the listing contact phone is hidden from agents.';
