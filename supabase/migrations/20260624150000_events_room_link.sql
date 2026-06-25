-- Link an event to an actual bookable meeting room so that scheduling an event
-- can block that room's time slot in the agent-facing boardroom booking screen.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES public.meeting_rooms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_room_date
  ON public.events(room_id, event_date)
  WHERE room_id IS NOT NULL;
