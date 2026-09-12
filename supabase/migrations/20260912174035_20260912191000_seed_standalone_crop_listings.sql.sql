/*
# Seed standalone crop listings for 4 farmers + FPO

## Purpose
Re-seed crop_listings with realistic standalone data after the full data reset.
No cluster data is created in this pass.

## Accounts seeded
- Ramesh Kumar (Farmer): 8 listings — 3 Upcoming, 3 Harvested, 2 Sold
- Lakshmi Devi (Farmer): 5 listings — 2 Upcoming, 2 Harvested, 1 Sold
- Anjali Reddy (Farmer): 5 listings — 2 Upcoming, 2 Harvested, 1 Sold
- Prasad Rao (Farmer): 5 listings — 2 Upcoming, 2 Harvested, 1 Sold
- Warangal Farmers FPO: 4 listings — 2 Upcoming, 1 Harvested, 1 Sold
  (exists in DB but NOT visible in frontend — FPO role is excluded from login)

## Approach
1. Temporarily disable the auto_cluster_crop AFTER INSERT trigger to prevent
   automatic cluster creation during seeding.
2. INSERT all listings with status='Upcoming' first (no price-clock needed).
3. INSERT Harvested/Sold listings, then UPDATE them to trigger populate_price_clock.
4. Re-enable the auto_cluster_crop trigger.

## Price-clock for Harvested/Sold
The populate_price_clock() trigger fires BEFORE UPDATE when transitioning
to Harvested/Sold. We INSERT as 'Upcoming' then UPDATE to 'Harvested'/'Sold'
to trigger it. This sets price_start_per_kg, price_floor_per_kg, decay_speed,
price_drop_started_at, step_interval_minutes, step_drop_amount automatically.

## Important notes
1. All quantities are in the 50-300kg range, varied, no duplicates per farmer.
2. All harvest dates are unique per farmer.
3. available_quantity_kg <= quantity_kg for every listing.
4. is_cluster_linked = false for all (standalone listings).
5. The auto_cluster_crop trigger is re-enabled at the end.
*/

-- Disable auto-cluster trigger during seeding
ALTER TABLE crop_listings DISABLE TRIGGER crop_listings_after_insert_cluster;

-- ============================================================
-- RAMESH KUMAR (177e32f1-10e9-41e6-a71f-e8a8d3bde1d4) — 8 listings
-- 3 Upcoming, 3 Harvested, 2 Sold
-- ============================================================

-- Upcoming (insert directly)
INSERT INTO crop_listings (owner_id, crop_id, quantity_kg, available_quantity_kg, expected_harvest_date, location_area, indicative_price_per_kg, status, is_visible)
VALUES
('177e32f1-10e9-41e6-a71f-e8a8d3bde1d4', '7b9487f1-94bf-43f9-8062-7a10b45e0e2d', 200, 200, '2026-10-15', 'Warangal', 28.00, 'Upcoming', true),
('177e32f1-10e9-41e6-a71f-e8a8d3bde1d4', '8bf39674-cb4e-47e7-8bd0-8321aed0074f', 150, 150, '2026-10-22', 'Warangal', 52.00, 'Upcoming', true),
('177e32f1-10e9-41e6-a71f-e8a8d3bde1d4', 'd779a372-090b-460a-9f37-163b9c9ed529', 180, 180, '2026-11-05', 'Warangal', 22.00, 'Upcoming', true);

-- Harvested + Sold (insert as Upcoming, then UPDATE to trigger price-clock)
INSERT INTO crop_listings (owner_id, crop_id, quantity_kg, available_quantity_kg, harvested_at, location_area, indicative_price_per_kg, status, is_visible)
VALUES
('177e32f1-10e9-41e6-a71f-e8a8d3bde1d4', '5ce01cdd-052c-4c68-9fc8-6a9a0dcfb0dc', 120, 120, '2026-09-01', 'Warangal', 30.00, 'Upcoming', true),
('177e32f1-10e9-41e6-a71f-e8a8d3bde1d4', '860e4dc8-953f-43fd-8739-77bf9217051d', 165, 165, '2026-09-05', 'Warangal', 45.00, 'Upcoming', true),
('177e32f1-10e9-41e6-a71f-e8a8d3bde1d4', '7b9487f1-94bf-43f9-8062-7a10b45e0e2d', 280, 280, '2026-09-08', 'Warangal', 26.00, 'Upcoming', true),
('177e32f1-10e9-41e6-a71f-e8a8d3bde1d4', 'd779a372-090b-460a-9f37-163b9c9ed529', 210, 210, '2026-09-10', 'Warangal', 24.00, 'Upcoming', true),
('177e32f1-10e9-41e6-a71f-e8a8d3bde1d4', '8bf39674-cb4e-47e7-8bd0-8321aed0074f', 90, 90, '2026-09-12', 'Warangal', 55.00, 'Upcoming', true);

-- Now update the 5 Harvested/Sold listings to trigger populate_price_clock
-- First 3 → Harvested
UPDATE crop_listings SET status = 'Harvested' WHERE owner_id = '177e32f1-10e9-41e6-a71f-e8a8d3bde1d4' AND harvested_at IN ('2026-09-01', '2026-09-05', '2026-09-08') AND status = 'Upcoming';
-- Last 2 → Sold
UPDATE crop_listings SET status = 'Sold' WHERE owner_id = '177e32f1-10e9-41e6-a71f-e8a8d3bde1d4' AND harvested_at IN ('2026-09-10', '2026-09-12') AND status = 'Upcoming';

-- ============================================================
-- LAKSHMI DEVI (f38e4d09-d277-4d60-a0ce-13ef511b82fa) — 5 listings
-- 2 Upcoming, 2 Harvested, 1 Sold
-- ============================================================

INSERT INTO crop_listings (owner_id, crop_id, quantity_kg, available_quantity_kg, expected_harvest_date, location_area, indicative_price_per_kg, status, is_visible)
VALUES
('f38e4d09-d277-4d60-a0ce-13ef511b82fa', 'cc9ab8e6-9174-40c4-b2e8-cc8645a3bb15', 160, 160, '2026-10-18', 'Khammam', 18.00, 'Upcoming', true),
('f38e4d09-d277-4d60-a0ce-13ef511b82fa', '26ecac04-4a79-4b6a-befa-78e96ef9af73', 140, 140, '2026-11-01', 'Khammam', 35.00, 'Upcoming', true);

INSERT INTO crop_listings (owner_id, crop_id, quantity_kg, available_quantity_kg, harvested_at, location_area, indicative_price_per_kg, status, is_visible)
VALUES
('f38e4d09-d277-4d60-a0ce-13ef511b82fa', '5a569e3f-6108-4def-b840-4a3d9be3a0cb', 85, 85, '2026-09-03', 'Khammam', 20.00, 'Upcoming', true),
('f38e4d09-d277-4d60-a0ce-13ef511b82fa', 'd34c0405-fd85-4e13-8525-de836734b628', 120, 120, '2026-09-07', 'Khammam', 32.00, 'Upcoming', true),
('f38e4d09-d277-4d60-a0ce-13ef511b82fa', 'cc9ab8e6-9174-40c4-b2e8-cc8645a3bb15', 200, 200, '2026-09-11', 'Khammam', 16.00, 'Upcoming', true);

UPDATE crop_listings SET status = 'Harvested' WHERE owner_id = 'f38e4d09-d277-4d60-a0ce-13ef511b82fa' AND harvested_at IN ('2026-09-03', '2026-09-07') AND status = 'Upcoming';
UPDATE crop_listings SET status = 'Sold' WHERE owner_id = 'f38e4d09-d277-4d60-a0ce-13ef511b82fa' AND harvested_at = '2026-09-11' AND status = 'Upcoming';

-- ============================================================
-- ANJALI REDDY (aaf802b7-ac30-4340-9acd-e804d0a46644) — 5 listings
-- 2 Upcoming, 2 Harvested, 1 Sold
-- ============================================================

INSERT INTO crop_listings (owner_id, crop_id, quantity_kg, available_quantity_kg, expected_harvest_date, location_area, indicative_price_per_kg, status, is_visible)
VALUES
('aaf802b7-ac30-4340-9acd-e804d0a46644', '860e4dc8-953f-43fd-8739-77bf9217051d', 175, 175, '2026-10-20', 'Kadapa', 48.00, 'Upcoming', true),
('aaf802b7-ac30-4340-9acd-e804d0a46644', 'c51f8677-1331-404e-bcac-17bf44e40d86', 110, 110, '2026-11-08', 'Kadapa', 60.00, 'Upcoming', true);

INSERT INTO crop_listings (owner_id, crop_id, quantity_kg, available_quantity_kg, harvested_at, location_area, indicative_price_per_kg, status, is_visible)
VALUES
('aaf802b7-ac30-4340-9acd-e804d0a46644', '5ce01cdd-052c-4c68-9fc8-6a9a0dcfb0dc', 130, 130, '2026-09-02', 'Kadapa', 28.00, 'Upcoming', true),
('aaf802b7-ac30-4340-9acd-e804d0a46644', '7b9487f1-94bf-43f9-8062-7a10b45e0e2d', 220, 220, '2026-09-06', 'Kadapa', 24.00, 'Upcoming', true),
('aaf802b7-ac30-4340-9acd-e804d0a46644', '8bf39674-cb4e-47e7-8bd0-8321aed0074f', 95, 95, '2026-09-09', 'Kadapa', 50.00, 'Upcoming', true);

UPDATE crop_listings SET status = 'Harvested' WHERE owner_id = 'aaf802b7-ac30-4340-9acd-e804d0a46644' AND harvested_at IN ('2026-09-02', '2026-09-06') AND status = 'Upcoming';
UPDATE crop_listings SET status = 'Sold' WHERE owner_id = 'aaf802b7-ac30-4340-9acd-e804d0a46644' AND harvested_at = '2026-09-09' AND status = 'Upcoming';

-- ============================================================
-- PRASAD RAO (a266a127-f8cb-4f8c-a03a-c7378aa59f09) — 5 listings
-- 2 Upcoming, 2 Harvested, 1 Sold
-- ============================================================

INSERT INTO crop_listings (owner_id, crop_id, quantity_kg, available_quantity_kg, expected_harvest_date, location_area, indicative_price_per_kg, status, is_visible)
VALUES
('a266a127-f8cb-4f8c-a03a-c7378aa59f09', '9d5dcd1e-fa16-422c-931f-42b8e9ca5f54', 250, 250, '2026-10-25', 'Nalgonda', 15.00, 'Upcoming', true),
('a266a127-f8cb-4f8c-a03a-c7378aa59f09', 'e711c324-78d4-4355-90bf-b7d5f380a521', 180, 180, '2026-11-10', 'Nalgonda', 42.00, 'Upcoming', true);

INSERT INTO crop_listings (owner_id, crop_id, quantity_kg, available_quantity_kg, harvested_at, location_area, indicative_price_per_kg, status, is_visible)
VALUES
('a266a127-f8cb-4f8c-a03a-c7378aa59f09', '7b9487f1-94bf-43f9-8062-7a10b45e0e2d', 145, 145, '2026-09-04', 'Nalgonda', 25.00, 'Upcoming', true),
('a266a127-f8cb-4f8c-a03a-c7378aa59f09', 'd779a372-090b-460a-9f37-163b9c9ed529', 190, 190, '2026-09-08', 'Nalgonda', 21.00, 'Upcoming', true),
('a266a127-f8cb-4f8c-a03a-c7378aa59f09', '26ecac04-4a79-4b6a-befa-78e96ef9af73', 115, 115, '2026-09-13', 'Nalgonda', 38.00, 'Upcoming', true);

UPDATE crop_listings SET status = 'Harvested' WHERE owner_id = 'a266a127-f8cb-4f8c-a03a-c7378aa59f09' AND harvested_at IN ('2026-09-04', '2026-09-08') AND status = 'Upcoming';
UPDATE crop_listings SET status = 'Sold' WHERE owner_id = 'a266a127-f8cb-4f8c-a03a-c7378aa59f09' AND harvested_at = '2026-09-13' AND status = 'Upcoming';

-- ============================================================
-- WARANGAL FARMERS FPO (fd13a229-ff4f-4134-9b86-1d34721053e0) — 4 listings
-- 2 Upcoming, 1 Harvested, 1 Sold
-- FPO role is excluded from the login screen (visibleRoles filters out 'FPO'),
-- so these listings exist in the database but are NOT visible in any frontend view.
-- ============================================================

INSERT INTO crop_listings (owner_id, crop_id, quantity_kg, available_quantity_kg, expected_harvest_date, location_area, indicative_price_per_kg, status, is_visible)
VALUES
('fd13a229-ff4f-4134-9b86-1d34721053e0', '8bf39674-cb4e-47e7-8bd0-8321aed0074f', 300, 300, '2026-10-30', 'Warangal', 50.00, 'Upcoming', true),
('fd13a229-ff4f-4134-9b86-1d34721053e0', 'd779a372-090b-460a-9f37-163b9c9ed529', 260, 260, '2026-11-12', 'Warangal', 23.00, 'Upcoming', true);

INSERT INTO crop_listings (owner_id, crop_id, quantity_kg, available_quantity_kg, harvested_at, location_area, indicative_price_per_kg, status, is_visible)
VALUES
('fd13a229-ff4f-4134-9b86-1d34721053e0', '5ce01cdd-052c-4c68-9fc8-6a9a0dcfb0dc', 170, 170, '2026-09-05', 'Warangal', 32.00, 'Upcoming', true),
('fd13a229-ff4f-4134-9b86-1d34721053e0', '7b9487f1-94bf-43f9-8062-7a10b45e0e2d', 240, 240, '2026-09-09', 'Warangal', 27.00, 'Upcoming', true);

UPDATE crop_listings SET status = 'Harvested' WHERE owner_id = 'fd13a229-ff4f-4134-9b86-1d34721053e0' AND harvested_at = '2026-09-05' AND status = 'Upcoming';
UPDATE crop_listings SET status = 'Sold' WHERE owner_id = 'fd13a229-ff4f-4134-9b86-1d34721053e0' AND harvested_at = '2026-09-09' AND status = 'Upcoming';

-- Re-enable auto-cluster trigger
ALTER TABLE crop_listings ENABLE TRIGGER crop_listings_after_insert_cluster;