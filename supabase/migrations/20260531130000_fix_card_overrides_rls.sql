-- Ensure admins can INSERT and UPDATE card overrides (explicit WITH CHECK)
DROP POLICY IF EXISTS "Admins manage card overrides" ON public.admin_card_overrides;

CREATE POLICY "Admins manage card overrides"
  ON public.admin_card_overrides FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
