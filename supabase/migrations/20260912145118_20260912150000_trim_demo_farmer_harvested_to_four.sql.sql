/*
# Trim demo farmer Harvested tab to exactly 4 listings

## What
Ramesh Kumar (demo.farmer@sasyasetu.demo, profile id 177e32f1-10e9-41e6-a71f-e8a8d3bde1d4)
had 10 Sold-status crop listings. This migration:
- Deletes 6 of them (and their orders / cluster memberships)
- Keeps 4: Onion, Tomato, Banana, Groundnut
- Sets distinct available_quantity_kg > 100 kg per card
- Sets distinct harvested_at dates spread across recent weeks

## Safety
- Only touches the demo farmer's data (specific listing UUIDs)
- Does not affect Upcoming or Cluster tabs
- Price-clock fields left intact
*/

-- Delete orders for the 6 listings being removed
DELETE FROM orders WHERE listing_id IN (
  'a9023eb4-6b4e-4129-8e95-252fc84cc353',
  'cbcae622-0a35-4ccf-aae6-aeb2d159633c',
  'b759505c-99df-49bf-a54e-06340ef665ae',
  '5a926354-0922-438e-ac05-c0bbbf4f5fcb',
  '7b1a83be-0030-4305-9121-d33bdad780e6',
  'f21baed9-2a4c-44cc-b10c-051f73bb8361'
);

-- Delete cluster memberships for listings that had them
DELETE FROM crop_cluster_members WHERE crop_id IN (
  'cbcae622-0a35-4ccf-aae6-aeb2d159633c',
  'b759505c-99df-49bf-a54e-06340ef665ae',
  '5a926354-0922-438e-ac05-c0bbbf4f5fcb'
);

-- Delete the 6 extra Sold listings
DELETE FROM crop_listings WHERE id IN (
  'a9023eb4-6b4e-4129-8e95-252fc84cc353',
  'cbcae622-0a35-4ccf-aae6-aeb2d159633c',
  'b759505c-99df-49bf-a54e-06340ef665ae',
  '5a926354-0922-438e-ac05-c0bbbf4f5fcb',
  '7b1a83be-0030-4305-9121-d33bdad780e6',
  'f21baed9-2a4c-44cc-b10c-051f73bb8361'
);

-- Update the 4 remaining with distinct quantities > 100 kg and distinct harvest dates
UPDATE crop_listings SET available_quantity_kg = 280, harvested_at = '2026-09-10' WHERE id = 'fe445bb0-ec5f-4e7b-8d95-a204d44f8949';
UPDATE crop_listings SET available_quantity_kg = 165, harvested_at = '2026-09-08' WHERE id = '1aa86a80-8216-4df9-9967-a87b27deed1f';
UPDATE crop_listings SET available_quantity_kg = 210, harvested_at = '2026-09-05' WHERE id = '015bfe27-7145-4fa3-ad89-c810db72b135';
UPDATE crop_listings SET available_quantity_kg = 120, harvested_at = '2026-09-01' WHERE id = '1407226a-9aa4-4509-8e56-67c68e294278';