/*
# Add Lakshmi to Chilli Cluster for 3-Member Count

## Summary
The prior seed migration added Lakshmi to Tomato, Onion, and Paddy clusters
but missed Chilli. Chilli currently has only 2 members (Ramesh 30, Anjali 20).
This adds Lakshmi with 25 kg to bring it to 3 members and 75 kg total.

## Changes
1. Create a Chilli crop listing for Lakshmi in Kurnool.
2. Add Lakshmi as a member of the Chilli cluster.
3. Recalculate Chilli cluster totals and payout shares.
*/

DO $$
DECLARE
  v_lakshmi uuid;
  v_chilli_cluster uuid := '63ef1611-78ab-4106-82a8-140d369e7f4b';
  v_chilli_crop uuid := '860e4dc8-953f-43fd-8739-77bf9217051d';
  v_listing_id uuid;
  v_total numeric(12,2);
BEGIN
  SELECT id INTO v_lakshmi FROM public.profiles WHERE display_name = 'Lakshmi Devi';

  ALTER TABLE public.crop_listings DISABLE TRIGGER crop_listings_after_insert_cluster;

  v_listing_id := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, expected_harvest_date)
  VALUES (v_listing_id, v_lakshmi, v_chilli_crop, 25, 25, 'Upcoming', 'Kurnool', '2026-09-25');
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, payout_share_percent)
  VALUES (v_chilli_cluster, v_listing_id, v_lakshmi, 25, 0);

  ALTER TABLE public.crop_listings ENABLE TRIGGER crop_listings_after_insert_cluster;

  -- Recalculate Chilli cluster
  SELECT COALESCE(sum(quantity_contributed), 0) INTO v_total
  FROM public.crop_cluster_members WHERE cluster_id = v_chilli_cluster;

  UPDATE public.crop_clusters
  SET total_quantity = v_total,
      status = CASE WHEN v_total >= 100 THEN 'ready' ELSE 'forming' END
  WHERE id = v_chilli_cluster;

  UPDATE public.crop_cluster_members
  SET payout_share_percent = round((quantity_contributed / v_total) * 100, 2)
  WHERE cluster_id = v_chilli_cluster;
END $$;
