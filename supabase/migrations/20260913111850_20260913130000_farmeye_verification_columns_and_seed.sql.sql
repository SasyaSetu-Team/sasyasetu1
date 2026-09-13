/*
# FarmEye mock verification — schema columns and seed data

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
1. listing_verified (boolean, default false) — whether the listing's
   crop has been satellite-verified at the growing stage
2. listing_verified_at (timestamptz, nullable) — when listing was verified
3. listing_vegetation_reading (text, nullable) — human-readable vegetation
   detection result (e.g. "Growing crop detected")
4. harvest_timing_verified (boolean, default false) — whether satellite
   confirmed the harvest timing
5. harvest_quantity_verified (boolean, default false) — whether satellite
   confirmed the harvested quantity
6. harvest_verified_at (timestamptz, nullable) — when harvest was verified

## Seeded Data — Ramesh Kumar's standalone listings

### Upcoming (listing checkpoint)
- Onion (200 kg, id 03855c51): listing_verified = true,
  listing_verified_at = now, listing_vegetation_reading = 'Growing crop detected'
- Groundnut (150 kg, id cb822ec1): listing_verified = false (unverified)
- Paddy (180 kg, id 74f6bd3d): listing_verified = false (unverified)

### Harvested/Sold (harvest checkpoint — both fields required)
- Tomato (120 kg, Harvested, id 0f5bb6a8): harvest_timing = true,
  harvest_quantity = true, harvest_verified_at = now → PASSES
- Chilli (165 kg, Harvested, id 74370ac3): harvest_timing = true,
  harvest_quantity = false → FAILS (mixed, no badge)
- Onion (280 kg, Harvested, id db945333): both false → FAILS
- Paddy (210 kg, Sold, id dd2abf79): both false → FAILS
- Groundnut (90 kg, Sold, id 8d503140): both false → FAILS

## Seeded Data — Cluster-linked listings

### Cluster c7f9196e (3 members: Ramesh, Lakshmi, Anjali)
- Ramesh — Groundnut (90 kg, Sold, id b5c04d5c): listing_verified = true,
  harvest_timing = true, harvest_quantity = true, harvest_verified_at = now
- Lakshmi — (55 kg, id 9fee80ef): listing_verified = false (unverified)
- Anjali — (65 kg, id 6b9249c0): listing_verified = true,
  listing_verified_at = now, listing_vegetation_reading = 'Growing crop detected'
  → 2 of 3 listings verified (fraction badge has real data)

### Cluster 121a6118 (2 members: Ramesh, Anjali)
- Ramesh — Tomato (80 kg, Upcoming, id 7d033817): listing_verified = true,
  listing_verified_at = now, listing_vegetation_reading = 'Growing crop detected'
- Anjali — (75 kg, id 42c6aa54): listing_verified = false
  → 1 of 2 listings verified

## Security
- No RLS policy changes. New columns inherit existing crop_listings
  policies (owner-scoped SELECT/INSERT/UPDATE/DELETE).
- No changes to grants or SECURITY DEFINER functions.

## Important Notes
1. All new columns are nullable or have safe defaults (false / null)
   so existing listings and non-farmer data are unaffected.
2. No price-clock columns, is_cluster_linked, or status values were
   modified.
3. The harvest checkpoint requires BOTH booleans — this is the rule
   that gates the card-level "Verified" badge in a later UI phase.
*/