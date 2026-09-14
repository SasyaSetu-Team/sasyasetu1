-- 1. Narrow all Harvested/Sold harvested_at to Sep 10–15, 2026 (varied across the range)
WITH ranked AS (
  SELECT id, (ROW_NUMBER() OVER (ORDER BY id) - 1) % 6 AS day_offset
  FROM crop_listings
  WHERE status IN ('Harvested', 'Sold')
)
UPDATE crop_listings cl
SET harvested_at = (('2026-09-10'::date) + (day_offset * INTERVAL '1 day'))::date
FROM ranked
WHERE cl.id = ranked.id;

-- 2. Boost Upcoming listing_verified to ~70% (12 of 17 verified)
UPDATE crop_listings
SET listing_verified = true
WHERE status = 'Upcoming'
  AND id IN (
    '27e5802f-7c3d-4463-8bce-0bd28c1495a6',
    '42c6aa54-e00b-4234-a7b9-e1d44da30bcf',
    '4324969a-ce4a-4594-b494-67529aff99dc',
    '63c17f0d-d932-4575-b8ac-a53d21be4820',
    '652a08d0-72e1-435e-813f-f0da9debd11c',
    '7181fe3b-c878-461b-a239-376ab0be8d51',
    '88067600-cc47-45fb-8be3-29a85100c1ee',
    '9d326b1d-6db1-45da-b0b4-706e720b9ce7'
  );

-- 3. Boost Harvested verification to ~70% (7 of 10 with both timing + quantity verified)
UPDATE crop_listings
SET harvest_timing_verified = true,
    harvest_quantity_verified = true
WHERE status = 'Harvested'
  AND id IN (
    '8db86bf6-8e89-4bc4-bfda-f62227269e11',
    '436c24c0-5ea9-4435-8f17-e950d6811132',
    'af6158ad-640d-4da3-8521-7931a707d6dd',
    '74370ac3-bd10-4b48-8fe1-221a2ef21ee4',
    '3e988ec6-d27f-40b6-87d9-005e961b7f0e',
    '3754a793-6019-4ec3-9eaa-02b3c185a303'
  );
