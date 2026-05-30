-- Personal reminders created by agents on their own calendar (moved from localStorage to DB)
CREATE TABLE IF NOT EXISTS public.personal_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  title text NOT NULL,
  note text,
  remind_at timestamptz NOT NULL,
  notified boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.personal_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents manage own personal reminders"
  ON public.personal_reminders FOR ALL
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()))
  WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Admins view all personal reminders"
  ON public.personal_reminders FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_personal_reminders_agent ON public.personal_reminders(agent_id, remind_at);

-- Announcements admin UI needs nothing extra (table exists). Enable realtime if not already.
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.in_app_notifications;
EXCEPTION WHEN duplicate_object THEN null; END $$;
