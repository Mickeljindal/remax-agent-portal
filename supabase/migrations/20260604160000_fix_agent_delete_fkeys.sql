-- Fix: allow deleting agents by cascading/nullifying their references in related tables.
-- Without this, deleting an agent from the admin panel fails with a FK violation.

-- email_notifications → set agent ref to null on delete
ALTER TABLE public.email_notifications
  DROP CONSTRAINT IF EXISTS email_notifications_recipient_agent_id_fkey,
  ADD CONSTRAINT email_notifications_recipient_agent_id_fkey
    FOREIGN KEY (recipient_agent_id) REFERENCES public.agents(id) ON DELETE SET NULL;

-- in_app_notifications → cascade delete (no point keeping notifications for a deleted agent)
ALTER TABLE public.in_app_notifications
  DROP CONSTRAINT IF EXISTS in_app_notifications_agent_id_fkey,
  ADD CONSTRAINT in_app_notifications_agent_id_fkey
    FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;

-- support_tickets → cascade delete
ALTER TABLE public.support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_agent_id_fkey,
  ADD CONSTRAINT support_tickets_agent_id_fkey
    FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;

-- room_bookings → cascade delete
ALTER TABLE public.room_bookings
  DROP CONSTRAINT IF EXISTS room_bookings_agent_id_fkey,
  ADD CONSTRAINT room_bookings_agent_id_fkey
    FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;

-- course_certificates → cascade delete
ALTER TABLE public.course_certificates
  DROP CONSTRAINT IF EXISTS course_certificates_agent_id_fkey,
  ADD CONSTRAINT course_certificates_agent_id_fkey
    FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;

-- agent_portal_settings → cascade delete
ALTER TABLE public.agent_portal_settings
  DROP CONSTRAINT IF EXISTS agent_portal_settings_agent_id_fkey,
  ADD CONSTRAINT agent_portal_settings_agent_id_fkey
    FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;

-- precon_worksheets → set null (keep the record for audit, just detach the agent)
ALTER TABLE public.precon_worksheets
  DROP CONSTRAINT IF EXISTS precon_worksheets_agent_id_fkey,
  ADD CONSTRAINT precon_worksheets_agent_id_fkey
    FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE SET NULL;
