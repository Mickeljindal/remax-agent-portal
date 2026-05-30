-- Seed two office locations + meeting rooms (only if none exist)
DO $$
DECLARE
  miss_id uuid;
  bram_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.office_locations) THEN
    INSERT INTO public.office_locations (name, address, phone, sort_order)
      VALUES ('Mississauga Office', '100 Milverton Dr #610, Mississauga, ON L5R 4H1', '(905) 507-4436', 0)
      RETURNING id INTO miss_id;
    INSERT INTO public.office_locations (name, address, phone, sort_order)
      VALUES ('Brampton Office', '2 County Court Blvd #401, Brampton, ON L6W 3W8', '(905) 456-1000', 1)
      RETURNING id INTO bram_id;

    INSERT INTO public.meeting_rooms (location_id, name, capacity, amenities, is_virtual) VALUES
      (miss_id, 'Boardroom A', 10, 'Projector · VC · Whiteboard', false),
      (miss_id, 'Meeting Room B', 4, 'Zoom-ready · TV', false),
      (miss_id, 'Virtual Room', 50, 'Zoom / Teams link', true),
      (bram_id, 'Conference Room', 12, 'Projector · Whiteboard', false),
      (bram_id, 'Huddle Room', 4, 'TV · Webcam', false),
      (bram_id, 'Virtual Room', 50, 'Zoom / Teams link', true);
  END IF;
END $$;
