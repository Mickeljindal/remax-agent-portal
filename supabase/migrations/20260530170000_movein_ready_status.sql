-- Add "Move-In Ready" sales status
INSERT INTO public.precon_statuses (name, color, sort_order) VALUES
  ('Move-In Ready', 'teal', 6)
ON CONFLICT (name) DO NOTHING;
