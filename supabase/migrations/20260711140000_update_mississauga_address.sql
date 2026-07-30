-- Mississauga office address change.
-- The seed migration only inserts offices when the table is empty, so existing
-- databases need an explicit UPDATE. Matches by name or the old street to be safe.
UPDATE public.office_locations
SET address = '102-115 Matheson Blvd W, Mississauga, ON L5R 3L1'
WHERE name = 'Mississauga Office'
   OR address ILIKE '%Milverton%';
