/*
# FarmEye verification columns and seed data

## Summary
Adds six new columns to crop_listings for FarmEye satellite-based
mock verification. Two independent checkpoints:
  1. LISTING checkpoint — listing_verified alone (for Upcoming crops)
  2. HARVEST checkpoint — requires BOTH harvest_timing_verified AND
     harvest_quantity_verified to be true (gates the card-level
     "Verified" badge for Harvested/Sold crops)

No UI changes in this pass. No changes to price-clock fields,
is_cluster_linked, or non-farmer data.

## New Columns on crop_listings
1. listing_verified (boolean, default false)
2. listing_verified_at (timestamptz, nullable)
3. listing_vegetation_reading (text, nullable)
4. harvest_timing_verified (boolean, default false)
5. harvest_quantity_verified (boolean, default false)
6. harvest_verified_at (timestamptz, nullable)

## Seeded Data
See detailed breakdown in migration comments. Ramesh Kumar's 12
listings get a mix of verified/unverified states across standalone
Upcoming, standalone Harvested/Sold, and cluster-linked listings.

## Security
- No RLS or grant changes. New columns inherit existing policies.
*/

-- 1. Add new columns
ALTER TABLE public.crop_listings
  ADD COLUMN IF NOT EXISTS listing_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS listing_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS listing_vegetation_reading text,
  ADD COLUMN IF NOT EXISTS harvest_timing_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS harvest_quantity_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS harvest_verified_at timestamptz;

-- 2. Seed standalone Upcoming listings (listing checkpoint)
-- Onion 200kg: verified
UPDATE public.crop_listings SET
  listing_verified = true,
  listing_verified_at = now(),
  listing_vegetation_reading = 'Growing crop detected'
WHERE id = '03855c51-cf6e-490c-8c6d-ea44f212147a';

-- Groundnut 150kg: unverified (default false, no update needed)
-- Paddy 180kg: unverified (default false, no update needed)

-- 3. Seed standalone Harvested/Sold listings (harvest checkpoint)
-- Tomato 120kg Harvested: BOTH true → passes
UPDATE public.crop_listings SET
  harvest_timing_verified = true,
  harvest_quantity_verified = true,
  harvest_verified_at = now()
WHERE id = '0f5bb6a8-9cdd-403e-86e2-8c6806447bf1';

-- Chilli 165kg Harvested: timing true, quantity false → fails (mixed)
UPDATE public.crop_listings SET
  harvest_timing_verified = true,
  harvest_quantity_verified = false
WHERE id = '74370ac3-bd10-4b48-8fe1-221a2ef21ee4';

-- Onion 280kg Harvested, Paddy 210kg Sold, Groundnut 90kg Sold:
-- all remain default false (no update needed)

-- 4. Seed cluster-linked listings
-- Cluster c7f9196e: Ramesh's Groundnut 90kg Sold — fully verified
UPDATE public.crop_listings SET
  listing_verified = true,
  listing_verified_at = now(),
  listing_vegetation_reading = 'Growing crop detected',
  harvest_timing_verified = true,
  harvest_quantity_verified = true,
  harvest_verified_at = now()
WHERE id = 'b5c04d5c-e549-4ddb-8c05-f5d51b7a9b9e';

-- Cluster c7f9196e: Anjali's listing — listing verified only
UPDATE public.crop_listings SET
  listing_verified = true,
  listing_verified_at = now(),
  listing_vegetation_reading = 'Growing crop detected'
WHERE id = '6b9249c0-cc0f-47a3-ae1b-b43c4fa588b3';

-- Cluster c7f9196e: Lakshmi's listing — unverified (default false)

-- Cluster 121a6118: Ramesh's Tomato 80kg Upcoming — listing verified
UPDATE public.crop_listings SET
  listing_verified = true,
  listing_verified_at = now(),
  listing_vegetation_reading = 'Growing crop detected'
WHERE id = '7d033817-00c0-4d73-bce8-62554ed5a309';

-- Cluster 121a6118: Anjali's listing — unverified (default false)

-- 5. Verify seeding
SELECT
  cl.id,
  c.name AS crop_name,
  cl.status,
  cl.is_cluster_linked,
  cl.listing_verified,
  cl.listing_vegetation_reading,
  cl.harvest_timing_verified,
  cl.harvest_quantity_verified
FROM public.crop_listings cl
LEFT JOIN public.crops c ON c.id = cl.crop_id
WHERE cl.owner_id = '177e32f1-10e9-41e6-a71f-e8a8d3bde1d4'
ORDER BY cl.is_cluster_linked, cl.status, cl.created_at;