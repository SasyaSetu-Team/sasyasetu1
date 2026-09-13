-- Set harvest verification for Ramesh's Banana Harvested listing
-- so it qualifies for the Verified badge (both fields required)
UPDATE public.crop_listings
SET harvest_timing_verified = true,
    harvest_quantity_verified = true,
    harvest_verified_at = now()
WHERE id = '7ffec5d3-86ce-49ef-958a-8a8c2bf5adf7';