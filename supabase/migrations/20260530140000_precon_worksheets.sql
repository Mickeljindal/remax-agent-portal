-- Pre-Con Worksheet Submissions (stored for admin portal viewing)
CREATE TABLE IF NOT EXISTS public.precon_worksheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  project_name text NOT NULL,
  model_name text,
  floor_type text,
  direction_exposure text,
  choices text[],
  need_parking boolean DEFAULT false,
  need_locker boolean DEFAULT false,
  worksheet_date text,
  additional_comments text,
  brokerage_name text,
  broker_agent_name text,
  broker_agent_email text,
  broker_office_phone text,
  broker_cell_phone text,
  broker_reco_number text,
  purchasers jsonb DEFAULT '[]',
  id_attachment_filename text,
  status text NOT NULL DEFAULT 'submitted', -- submitted, reviewed, processed, archived
  admin_notes text,
  email_sent boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.precon_worksheets ENABLE ROW LEVEL SECURITY;

-- Agents can insert and view their own worksheets
CREATE POLICY "Agents insert own worksheets"
  ON public.precon_worksheets FOR INSERT
  WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents view own worksheets"
  ON public.precon_worksheets FOR SELECT
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

-- Admins can view and manage all worksheets
CREATE POLICY "Admins manage all worksheets"
  ON public.precon_worksheets FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role (edge function) can insert
CREATE POLICY "Service can insert worksheets"
  ON public.precon_worksheets FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_precon_worksheets_agent ON public.precon_worksheets(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_precon_worksheets_status ON public.precon_worksheets(status, created_at DESC);
