-- Admin-editable labels for the admin panel cards (title + description overrides)
CREATE TABLE IF NOT EXISTS public.admin_card_overrides (
  card_key text PRIMARY KEY,
  title text,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_card_overrides ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read (so the labels render), admins can change them
CREATE POLICY "Anyone authenticated reads card overrides"
  ON public.admin_card_overrides FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage card overrides"
  ON public.admin_card_overrides FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));
