/*
# Add price-clock columns to crop_clusters + seed buffer demo data

## What this migration does

1. Adds price-clock columns to `crop_clusters` (same pattern as crop_listings):
   - price_start_per_kg, price_floor_per_kg, price_drop_started_at,
     step_interval_minutes, step_drop_amount, decay_speed
2. Sets indicative price values on existing clusters based on crop type
3. Seeds extra Harvested listings for demo farmers (Ramesh, Lakshmi) so
   the Harvested tab never goes empty during a demo walkthrough
4. Seeds an extra cluster invite (Cotton cluster) so the Cluster tab
   always has at least 2 invites (accepting one still leaves one behind)

## New columns on crop_clusters
- price_start_per_kg (numeric, nullable) — starting price per kg
- price_floor_per_kg (numeric, nullable) — minimum price floor
- price_drop_started_at (timestamptz, nullable) — when decay started
- step_interval_minutes (integer, nullable) — minutes between drops
- step_drop_amount (numeric, nullable) — price decrease per step
- decay_speed (text, nullable) — 'fast' | 'medium' | 'slow'

## Security
- No new tables. No policy changes. Existing RLS on crop_clusters unchanged.
- Uses get_decay_speed() function already defined in prior migration.
*/

-- 1. Add price-clock columns to crop_clusters
ALTER TABLE crop_clusters
  ADD COLUMN IF NOT EXISTS price_start_per_kg numeric,
  ADD COLUMN IF NOT EXISTS price_floor_per_kg numeric,
  ADD COLUMN IF NOT EXISTS price_drop_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS step_interval_minutes integer,
  ADD COLUMN IF NOT EXISTS step_drop_amount numeric,
  ADD COLUMN IF NOT EXISTS decay_speed text;

-- 2. Set price values on existing clusters (based on crop type)
UPDATE crop_clusters SET
  price_start_per_kg = 30,
  price_floor_per_kg = 21,
  step_interval_minutes = 30,
  step_drop_amount = 1.13,
  decay_speed = 'fast',
  price_drop_started_at = now()
WHERE crop_name = 'Tomato' AND price_start_per_kg IS NULL;

UPDATE crop_clusters SET
  price_start_per_kg = 28,
  price_floor_per_kg = 19.60,
  step_interval_minutes = 45,
  step_drop_amount = 1.05,
  decay_speed = 'slow',
  price_drop_started_at = now()
WHERE crop_name = 'Onion' AND price_start_per_kg IS NULL;

UPDATE crop_clusters SET
  price_start_per_kg = 38,
  price_floor_per_kg = 26.60,
  step_interval_minutes = 45,
  step_drop_amount = 1.43,
  decay_speed = 'slow',
  price_drop_started_at = now()
WHERE crop_name = 'Groundnut' AND price_start_per_kg IS NULL;

UPDATE crop_clusters SET
  price_start_per_kg = 20,
  price_floor_per_kg = 14,
  step_interval_minutes = 45,
  step_drop_amount = 0.75,
  decay_speed = 'slow',
  price_drop_started_at = now()
WHERE crop_name = 'Paddy' AND price_start_per_kg IS NULL;

UPDATE crop_clusters SET
  price_start_per_kg = 45,
  price_floor_per_kg = 31.50,
  step_interval_minutes = 30,
  step_drop_amount = 1.69,
  decay_speed = 'medium',
  price_drop_started_at = now()
WHERE crop_name = 'Chilli' AND price_start_per_kg IS NULL;

-- 3. Seed Harvested listings for Ramesh Kumar (177e32f1-10e9-41e6-a71f-e8a8d3bde1d4)
--    so the Harvested tab has at least 3 cards (buying one still leaves 2)
INSERT INTO crop_listings (owner_id, crop_id, custom_crop_name, quantity_kg, available_quantity_kg, status, harvested_at, indicative_price_per_kg, price_start_per_kg, price_floor_per_kg, price_drop_started_at, step_interval_minutes, step_drop_amount, decay_speed, is_visible, expected_harvest_date)
SELECT '177e32f1-10e9-41e6-a71f-e8a8d3bde1d4', id, NULL, 80, 80, 'Harvested', now() - interval '2 days', 30, 30, 21, now() - interval '2 days', 30, 1.13, 'fast', true, now() - interval '30 days'
FROM crops WHERE name = 'Tomato' AND NOT EXISTS (
  SELECT 1 FROM crop_listings WHERE owner_id = '177e32f1-10e9-41e6-a71f-e8a8d3bde1d4' AND crop_id = crops.id AND status = 'Harvested' AND quantity_kg = 80
);

INSERT INTO crop_listings (owner_id, crop_id, custom_crop_name, quantity_kg, available_quantity_kg, status, harvested_at, indicative_price_per_kg, price_start_per_kg, price_floor_per_kg, price_drop_started_at, step_interval_minutes, step_drop_amount, decay_speed, is_visible, expected_harvest_date)
SELECT '177e32f1-10e9-41e6-a71f-e8a8d3bde1d4', id, NULL, 60, 60, 'Harvested', now() - interval '1 day', 28, 28, 19.60, now() - interval '1 day', 45, 1.05, 'slow', true, now() - interval '30 days'
FROM crops WHERE name = 'Onion' AND NOT EXISTS (
  SELECT 1 FROM crop_listings WHERE owner_id = '177e32f1-10e9-41e6-a71f-e8a8d3bde1d4' AND crop_id = crops.id AND status = 'Harvested' AND quantity_kg = 60
);

INSERT INTO crop_listings (owner_id, crop_id, custom_crop_name, quantity_kg, available_quantity_kg, status, harvested_at, indicative_price_per_kg, price_start_per_kg, price_floor_per_kg, price_drop_started_at, step_interval_minutes, step_drop_amount, decay_speed, is_visible, expected_harvest_date)
SELECT '177e32f1-10e9-41e6-a71f-e8a8d3bde1d4', id, NULL, 50, 50, 'Harvested', now() - interval '3 days', 38, 38, 26.60, now() - interval '3 days', 45, 1.43, 'slow', true, now() - interval '30 days'
FROM crops WHERE name = 'Groundnut' AND NOT EXISTS (
  SELECT 1 FROM crop_listings WHERE owner_id = '177e32f1-10e9-41e6-a71f-e8a8d3bde1d4' AND crop_id = crops.id AND status = 'Harvested' AND quantity_kg = 50
);

-- 4. Seed Harvested listings for Lakshmi Devi (f38e4d09-d277-4d60-a0ce-13ef511b82fa)
INSERT INTO crop_listings (owner_id, crop_id, custom_crop_name, quantity_kg, available_quantity_kg, status, harvested_at, indicative_price_per_kg, price_start_per_kg, price_floor_per_kg, price_drop_started_at, step_interval_minutes, step_drop_amount, decay_speed, is_visible, expected_harvest_date)
SELECT 'f38e4d09-d277-4d60-a0ce-13ef511b82fa', id, NULL, 40, 40, 'Harvested', now() - interval '1 day', 30, 30, 21, now() - interval '1 day', 30, 1.13, 'fast', true, now() - interval '30 days'
FROM crops WHERE name = 'Tomato' AND NOT EXISTS (
  SELECT 1 FROM crop_listings WHERE owner_id = 'f38e4d09-d277-4d60-a0ce-13ef511b82fa' AND crop_id = crops.id AND status = 'Harvested' AND quantity_kg = 40
);

INSERT INTO crop_listings (owner_id, crop_id, custom_crop_name, quantity_kg, available_quantity_kg, status, harvested_at, indicative_price_per_kg, price_start_per_kg, price_floor_per_kg, price_drop_started_at, step_interval_minutes, step_drop_amount, decay_speed, is_visible, expected_harvest_date)
SELECT 'f38e4d09-d277-4d60-a0ce-13ef511b82fa', id, NULL, 35, 35, 'Harvested', now() - interval '2 days', 45, 45, 31.50, now() - interval '2 days', 30, 1.69, 'medium', true, now() - interval '30 days'
FROM crops WHERE name = 'Chilli' AND NOT EXISTS (
  SELECT 1 FROM crop_listings WHERE owner_id = 'f38e4d09-d277-4d60-a0ce-13ef511b82fa' AND crop_id = crops.id AND status = 'Harvested' AND quantity_kg = 35
);

-- 5. Add an extra "Cotton" cluster for more invite buffer
INSERT INTO crop_clusters (crop_name, variety, location_area, harvest_window_start, harvest_window_end, overall_quality_grade, total_quantity, status, closes_at, price_start_per_kg, price_floor_per_kg, price_drop_started_at, step_interval_minutes, step_drop_amount, decay_speed)
SELECT 'Cotton', 'BT Cotton', 'Anantapur', '2026-10-15', '2026-10-25', 'A', 90, 'forming', now() + interval '7 days', 50, 35, now(), 45, 1.88, 'slow'
WHERE NOT EXISTS (
  SELECT 1 FROM crop_clusters WHERE crop_name = 'Cotton' AND location_area = 'Anantapur'
);
