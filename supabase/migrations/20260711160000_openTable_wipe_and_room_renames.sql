-- Client-requested changes (confirmed):
--   1) Remove ALL "Open Table" calendar sessions (past + future).
--   2) Rename Mississauga "Boardroom A" -> "Meeting Room A".
--   3) Rename Brampton "Conference Room" -> "Meeting Room".
-- event_rsvps cascade-delete with their event. Safe to re-run.
DO $$
DECLARE
  miss_id uuid;
  bram_id uuid;
BEGIN
  SELECT id INTO miss_id FROM public.office_locations WHERE name ILIKE '%mississauga%' ORDER BY sort_order LIMIT 1;
  SELECT id INTO bram_id FROM public.office_locations WHERE name ILIKE '%brampton%'    ORDER BY sort_order LIMIT 1;

  -- 1) Wipe every "Open Table" session (all occurrences).
  DELETE FROM public.events WHERE title ILIKE '%open table%';

  -- 2) Mississauga: Boardroom A -> Meeting Room A
  IF miss_id IS NOT NULL THEN
    UPDATE public.meeting_rooms SET name = 'Meeting Room A'
      WHERE location_id = miss_id AND name = 'Boardroom A';
  END IF;

  -- 3) Brampton: Conference Room -> Meeting Room
  IF bram_id IS NOT NULL THEN
    UPDATE public.meeting_rooms SET name = 'Meeting Room'
      WHERE location_id = bram_id AND name = 'Conference Room';
  END IF;
END $$;
