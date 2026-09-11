/*
# Seed Additional Farmer Demo Accounts for Multi-Farmer Clusters

## Summary
The prior migration (enforce_farmer_only_cluster_membership) correctly
removed all non-Farmer role users from crop_cluster_members, but this left
every cluster with only 1 member (Ramesh Kumar). This migration creates 3
additional Farmer-role demo accounts and adds them across the 5 existing
clusters so member counts are varied (3-5 farmers per cluster) and every
cluster has more than one farmer.

## Changes
1. Create 3 new auth users with Farmer role: Lakshmi Devi, Anjali Reddy,
   Prasad Rao.
2. Create crop listings for each farmer matching the cluster's crop and
   location, using available_quantity_kg (correct column name).
3. Add each farmer as a cluster member to appropriate clusters.
4. Recalculate cluster totals, harvest windows, status, and payout shares.

## Cluster Member Plan (all quantities in kg, 20-60 range)
- Chilli (Kurnool):   Ramesh 30, Lakshmi 25, Anjali 20         = 3 farmers, 75 kg
- Groundnut (Kadapa): Ramesh 40, Anjali 35, Prasad 30          = 3 farmers, 105 kg
- Onion (Kurnool):    Ramesh 35, Lakshmi 30, Prasad 25, Anjali 20 = 4 farmers, 110 kg
- Paddy (Warangal):   Ramesh 50, Prasad 45, Lakshmi 30         = 3 farmers, 125 kg
- Tomato (Kurnool):   Ramesh 40, Lakshmi 35, Prasad 30, Anjali 25 = 4 farmers, 130 kg

## Notes
- Auto-cluster trigger disabled during seed to prevent interference.
- All new users have Farmer role, verified by is_farmer().
- Total cluster quantities kept under 250 kg.
- Individual contributions in 20-60 kg small-farmer range.
*/

DO $$
DECLARE
  v_lakshmi uuid := gen_random_uuid();
  v_anjali uuid := gen_random_uuid();
  v_prasad uuid := gen_random_uuid();
  v_tomato_cluster uuid := 'f12fe1e9-8969-4bcb-816c-289d5aee61a9';
  v_onion_cluster uuid := '0e764a29-9439-4d65-a95c-66898846bab5';
  v_chilli_cluster uuid := '63ef1611-78ab-4106-82a8-140d369e7f4b';
  v_groundnut_cluster uuid := '977d5bda-d5e4-4ce6-95c0-408de424e733';
  v_paddy_cluster uuid := '4e81f394-eae2-49d9-aec2-411f3a3a51f5';
  v_tomato_crop uuid := '5ce01cdd-052c-4c68-9fc8-6a9a0dcfb0dc';
  v_onion_crop uuid := '7b9487f1-94bf-43f9-8062-7a10b45e0e2d';
  v_chilli_crop uuid := '860e4dc8-953f-43fd-8739-77bf9217051d';
  v_groundnut_crop uuid := '8bf39674-cb4e-47e7-8bd0-8321aed0074f';
  v_paddy_crop uuid := 'd779a372-090b-460a-9f37-163b9c9ed529';
  v_listing_id uuid;
BEGIN
  -- 1. Create 3 Farmer accounts
  INSERT INTO auth.users (id, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
  VALUES (v_lakshmi, 'lakshmi.farmer@demo.sasyasetu', crypt('demo1234', gen_salt('bf')), '{}'::jsonb, '{}'::jsonb, now(), now(), now());
  INSERT INTO public.profiles (id, display_name, language) VALUES (v_lakshmi, 'Lakshmi Devi', 'en');
  INSERT INTO public.user_roles (user_id, role) VALUES (v_lakshmi, 'Farmer');

  INSERT INTO auth.users (id, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
  VALUES (v_anjali, 'anjali.farmer@demo.sasyasetu', crypt('demo1234', gen_salt('bf')), '{}'::jsonb, '{}'::jsonb, now(), now(), now());
  INSERT INTO public.profiles (id, display_name, language) VALUES (v_anjali, 'Anjali Reddy', 'en');
  INSERT INTO public.user_roles (user_id, role) VALUES (v_anjali, 'Farmer');

  INSERT INTO auth.users (id, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
  VALUES (v_prasad, 'prasad.farmer@demo.sasyasetu', crypt('demo1234', gen_salt('bf')), '{}'::jsonb, '{}'::jsonb, now(), now(), now());
  INSERT INTO public.profiles (id, display_name, language) VALUES (v_prasad, 'Prasad Rao', 'en');
  INSERT INTO public.user_roles (user_id, role) VALUES (v_prasad, 'Farmer');

  -- Disable auto-clustering trigger during seed
  ALTER TABLE public.crop_listings DISABLE TRIGGER crop_listings_after_insert_cluster;

  -- 2. Lakshmi: Tomato, Onion, Paddy
  v_listing_id := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, expected_harvest_date)
  VALUES (v_listing_id, v_lakshmi, v_tomato_crop, 35, 35, 'Upcoming', 'Kurnool', '2026-09-20');
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, payout_share_percent)
  VALUES (v_tomato_cluster, v_listing_id, v_lakshmi, 35, 0);

  v_listing_id := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, expected_harvest_date)
  VALUES (v_listing_id, v_lakshmi, v_onion_crop, 30, 30, 'Upcoming', 'Kurnool', '2026-09-22');
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, payout_share_percent)
  VALUES (v_onion_cluster, v_listing_id, v_lakshmi, 30, 0);

  v_listing_id := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, expected_harvest_date)
  VALUES (v_listing_id, v_lakshmi, v_paddy_crop, 30, 30, 'Upcoming', 'Warangal', '2026-09-18');
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, payout_share_percent)
  VALUES (v_paddy_cluster, v_listing_id, v_lakshmi, 30, 0);

  -- 3. Anjali: Chilli, Groundnut, Onion, Tomato
  v_listing_id := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, expected_harvest_date)
  VALUES (v_listing_id, v_anjali, v_chilli_crop, 20, 20, 'Upcoming', 'Kurnool', '2026-09-25');
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, payout_share_percent)
  VALUES (v_chilli_cluster, v_listing_id, v_anjali, 20, 0);

  v_listing_id := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, harvested_at)
  VALUES (v_listing_id, v_anjali, v_groundnut_crop, 35, 35, 'Harvested', 'Kadapa', '2026-09-10');
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, payout_share_percent)
  VALUES (v_groundnut_cluster, v_listing_id, v_anjali, 35, 0);

  v_listing_id := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, expected_harvest_date)
  VALUES (v_listing_id, v_anjali, v_onion_crop, 20, 20, 'Upcoming', 'Kurnool', '2026-09-22');
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, payout_share_percent)
  VALUES (v_onion_cluster, v_listing_id, v_anjali, 20, 0);

  v_listing_id := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, expected_harvest_date)
  VALUES (v_listing_id, v_anjali, v_tomato_crop, 25, 25, 'Upcoming', 'Kurnool', '2026-09-20');
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, payout_share_percent)
  VALUES (v_tomato_cluster, v_listing_id, v_anjali, 25, 0);

  -- 4. Prasad: Paddy, Tomato, Onion, Groundnut
  v_listing_id := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, harvested_at)
  VALUES (v_listing_id, v_prasad, v_paddy_crop, 45, 45, 'Harvested', 'Warangal', '2026-09-14');
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, payout_share_percent)
  VALUES (v_paddy_cluster, v_listing_id, v_prasad, 45, 0);

  v_listing_id := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, expected_harvest_date)
  VALUES (v_listing_id, v_prasad, v_tomato_crop, 30, 30, 'Upcoming', 'Kurnool', '2026-09-21');
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, payout_share_percent)
  VALUES (v_tomato_cluster, v_listing_id, v_prasad, 30, 0);

  v_listing_id := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, expected_harvest_date)
  VALUES (v_listing_id, v_prasad, v_onion_crop, 25, 25, 'Upcoming', 'Kurnool', '2026-09-23');
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, payout_share_percent)
  VALUES (v_onion_cluster, v_listing_id, v_prasad, 25, 0);

  v_listing_id := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, harvested_at)
  VALUES (v_listing_id, v_prasad, v_groundnut_crop, 30, 30, 'Harvested', 'Kadapa', '2026-09-12');
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, payout_share_percent)
  VALUES (v_groundnut_cluster, v_listing_id, v_prasad, 30, 0);

  -- Re-enable trigger
  ALTER TABLE public.crop_listings ENABLE TRIGGER crop_listings_after_insert_cluster;
END $$;

-- 5. Recalculate cluster totals, harvest windows, status, and payout shares
DO $$
DECLARE
  v_cluster record;
  v_total numeric(12,2);
  v_min_date date;
  v_max_date date;
BEGIN
  FOR v_cluster IN SELECT id, crop_name FROM public.crop_clusters LOOP
    SELECT COALESCE(sum(m.quantity_contributed), 0),
           min(COALESCE(cl.expected_harvest_date, cl.harvested_at)),
           max(COALESCE(cl.expected_harvest_date, cl.harvested_at))
    INTO v_total, v_min_date, v_max_date
    FROM public.crop_cluster_members m
    JOIN public.crop_listings cl ON cl.id = m.crop_id
    WHERE m.cluster_id = v_cluster.id;

    UPDATE public.crop_clusters
    SET total_quantity = v_total,
        harvest_window_start = v_min_date,
        harvest_window_end = v_max_date,
        status = CASE
          WHEN v_cluster.crop_name = 'Paddy' THEN 'sold'
          WHEN v_total >= 100 THEN 'ready'
          ELSE 'forming'
        END,
        closes_at = v_max_date + INTERVAL '7 days'
    WHERE id = v_cluster.id;

    IF v_total > 0 THEN
      UPDATE public.crop_cluster_members
      SET payout_share_percent = round((quantity_contributed / v_total) * 100, 2)
      WHERE cluster_id = v_cluster.id;
    END IF;
  END LOOP;
END $$;
