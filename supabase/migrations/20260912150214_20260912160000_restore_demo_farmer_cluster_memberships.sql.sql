/*
# Restore demo farmer's cluster memberships deleted by Harvested cleanup

## What happened
The previous migration (trim_demo_farmer_harvested_to_four) deleted
3 crop_cluster_members rows for Ramesh Kumar (demo farmer) along with
the crop_listings they referenced:
  - Paddy cluster (4e81f394, status=sold) — listing 5a926354 deleted
  - Groundnut cluster (977d5bda, status=ready) — listing cbcae622 deleted
  - Onion cluster (0e764a29, status=ready) — listing b759505c deleted

## Fix
1. Re-create a Paddy crop_listing for Ramesh (Sold status, with
   price-clock fields) so the Paddy cluster membership has a valid
   crop_listing to reference.
2. Re-create the 3 crop_cluster_members rows:
   - Paddy cluster → new Paddy listing
   - Groundnut cluster → existing Groundnut listing (1407226a)
   - Onion cluster → existing Onion listing (fe445bb0)

## Safety
- Only touches the demo farmer's data
- Does not change cluster logic, RLS, triggers, or UI
- Restores exactly the memberships that were deleted
*/

-- 1. Re-create the deleted Paddy crop listing for Ramesh
INSERT INTO crop_listings (
  id, owner_id, crop_id, quantity_kg, available_quantity_kg,
  expected_harvest_date, harvested_at, indicative_price_per_kg,
  status, is_visible, location_area, created_at, updated_at,
  price_start_per_kg, price_floor_per_kg, decay_speed,
  price_drop_started_at, step_interval_minutes, step_drop_amount
) VALUES (
  '5a926354-0922-438e-ac05-c0bbbf4f5fcb',
  '177e32f1-10e9-41e6-a71f-e8a8d3bde1d4',
  'd779a372-090b-460a-9f37-163b9c9ed529',
  50, 50,
  NULL, '2026-09-12',
  20.00,
  'Sold', true, 'Warangal',
  now(), now(),
  20.00, 14.00, 'slow',
  now(), 45, 0.75
);

-- 2. Re-create the 3 deleted cluster memberships
-- Paddy cluster (sold → shows in Harvested tab)
INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent)
VALUES (
  '4e81f394-eae2-49d9-aec2-411f3a3a51f5',
  '5a926354-0922-438e-ac05-c0bbbf4f5fcb',
  '177e32f1-10e9-41e6-a71f-e8a8d3bde1d4',
  50, 'A', 40.00
);

-- Groundnut cluster (ready → shows in Upcoming tab)
INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent)
VALUES (
  '977d5bda-d5e4-4ce6-95c0-408de424e733',
  '1407226a-9aa4-4509-8e56-67c68e294278',
  '177e32f1-10e9-41e6-a71f-e8a8d3bde1d4',
  50, 'A', 25.00
);

-- Onion cluster (ready → shows in Upcoming tab)
INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent)
VALUES (
  '0e764a29-9439-4d65-a95c-66898846bab5',
  'fe445bb0-ec5f-4e7b-8d95-a204d44f8949',
  '177e32f1-10e9-41e6-a71f-e8a8d3bde1d4',
  35, 'A', 25.00
);