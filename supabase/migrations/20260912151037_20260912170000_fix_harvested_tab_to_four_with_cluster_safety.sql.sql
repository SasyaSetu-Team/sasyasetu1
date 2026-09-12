/*
# Fix Harvested tab to exactly 4 listings (cluster-safe)

## Current state (5 Sold listings for demo farmer)
1. Groundnut  120 kg  Sep 1   — cluster member, keep
2. Banana    210 kg  Sep 5   — no cluster, REMOVE
3. Tomato    165 kg  Sep 8   — no cluster, keep
4. Onion     280 kg  Sep 10  — cluster member, keep
5. Paddy      50 kg  Sep 12  — cluster member, keep, fix quantity

## Changes
- Delete Banana listing (015bfe27) and its order (no cluster membership)
- Update Paddy available_quantity_kg from 50 to 150 (>100, distinct)
- Result: 4 listings, all >100 kg, all different dates, price-clock untouched
*/

-- Delete order for Banana listing
DELETE FROM orders WHERE listing_id = '015bfe27-7145-4fa3-ad89-c810db72b135';

-- Delete Banana listing (no cluster membership)
DELETE FROM crop_listings WHERE id = '015bfe27-7145-4fa3-ad89-c810db72b135';

-- Fix Paddy quantity: 50 → 150 (above 100, distinct from 120/165/280)
UPDATE crop_listings SET available_quantity_kg = 150 WHERE id = '5a926354-0922-438e-ac05-c0bbbf4f5fcb';