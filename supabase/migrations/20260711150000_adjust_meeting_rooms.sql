-- Adjust meeting rooms to match each office's real spaces.
--   Mississauga: 2 meeting rooms (Boardroom A, Meeting Room B) + 1 open
--     collaboration space, and NO virtual room.
--   Brampton: 1 meeting room only (Conference Room), and NO virtual/huddle room.
-- Safe to re-run.
DO $$
DECLARE
  miss_id uuid;
  bram_id uuid;
BEGIN
  SELECT id INTO miss_id FROM public.office_locations WHERE name ILIKE '%mississauga%' ORDER BY sort_order LIMIT 1;
  SELECT id INTO bram_id FROM public.office_locations WHERE name ILIKE '%brampton%'    ORDER BY sort_order LIMIT 1;

  -- Mississauga: turn the virtual room into an open collaboration space.
  IF miss_id IS NOT NULL THEN
    UPDATE public.meeting_rooms
      SET name = 'Open Collaboration Space',
          capacity = 8,
          amenities = 'Open seating · Whiteboard',
          is_virtual = false,
          is_active = true
      WHERE location_id = miss_id
        AND (is_virtual = true OR name ILIKE '%virtual%');
  END IF;

  -- Brampton: keep one meeting room only — remove huddle + virtual rooms.
  IF bram_id IS NOT NULL THEN
    DELETE FROM public.meeting_rooms
      WHERE location_id = bram_id
        AND (is_virtual = true OR name ILIKE '%virtual%' OR name ILIKE '%huddle%');
  END IF;
END $$;
