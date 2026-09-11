/*
# Reset Cluster Demo Data: Small-Farmer Quantities + Varied Member Counts

## Summary
Replaces the old cluster demo seed data (which used large commercial-scale
quantities like 700–5500 kg and all clusters had 2–3 members) with new
data that reflects the feature's purpose: small farmers pooling small
quantities. Every cluster total is under 250 kg, each individual farmer's
contribution is 20–50 kg, and member counts vary across clusters (2, 3, 4
existing members on invite clusters → becomes 3, 4, 5 if you join; 3, 4
total members on joined clusters).

Also updates the profiles SELECT policy so authenticated users can read
all display_name values (needed for the invite card to show contributing
farmers' actual names instead of just a count).

## Changes
1. profiles RLS: SELECT policy changed from auth.uid()=id to USING(true)
   so any signed-in user can read other farmers' display_name.
2. Deletes all existing crop_cluster_members and crop_clusters (all seed data).
3. Deletes the old seed crop_listings (identified by owner + crop + location
   + quantity combinations from the original seed migration).
4. Inserts new seed data:
   - 3 invite clusters (Tomato/Onion/Chilli in Kurnool, forming) with 2, 3, 4
     existing members respectively.
   - 2 joined clusters (Groundnut in Kadapa ready/in-transit, Paddy in Warangal
     sold) with 3, 4 total members.
   - Ramesh has 3 unclustered listings (Tomato, Onion, Chilli in Kurnool) as
     invitation targets.
   - All individual contributions 20–50 kg, all cluster totals 75–170 kg.
5. Payout shares recalculated proportionally.
*/

-- 1. Allow all authenticated users to read profiles (display_name) for farmer names
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- 2. Delete all existing clusters and members
DELETE FROM public.crop_cluster_members;
DELETE FROM public.crop_clusters;

-- 3. Delete old seed crop listings
-- Identified by the specific owner + crop + location + quantity combos from the original seed
DELETE FROM public.crop_listings
WHERE owner_id = 'c25872bd-b069-47d6-acb0-9af7502d14fc' -- Venkat
  AND crop_id = '5ce01cdd-052c-4c68-9fc8-6a9a0dcfb0dc' -- Tomato
  AND location_area = 'Kurnool' AND quantity_kg = 400;
DELETE FROM public.crop_listings
WHERE owner_id = 'fd13a229-ff4f-4134-9b86-1d34721053e0' -- FPO
  AND crop_id = '5ce01cdd-052c-4c68-9fc8-6a9a0dcfb0dc' -- Tomato
  AND location_area = 'Kurnool' AND quantity_kg = 300;
DELETE FROM public.crop_listings
WHERE owner_id = 'c25872bd-b069-47d6-acb0-9af7502d14fc' -- Venkat
  AND crop_id = '7b9487f1-94bf-43f9-8062-7a10b45e0e2d' -- Onion
  AND location_area = 'Kurnool' AND quantity_kg = 500;
DELETE FROM public.crop_listings
WHERE owner_id = 'fd13a229-ff4f-4134-9b86-1d34721053e0' -- FPO
  AND crop_id = '7b9487f1-94bf-43f9-8062-7a10b45e0e2d' -- Onion
  AND location_area = 'Kurnool' AND quantity_kg = 400;
DELETE FROM public.crop_listings
WHERE owner_id = '177e32f1-10e9-41e6-a71f-e8a8d3bde1d4' -- Ramesh
  AND crop_id = '5ce01cdd-052c-4c68-9fc8-6a9a0dcfb0dc' -- Tomato
  AND location_area = 'Kurnool' AND quantity_kg = 500;
DELETE FROM public.crop_listings
WHERE owner_id = '177e32f1-10e9-41e6-a71f-e8a8d3bde1d4' -- Ramesh
  AND crop_id = '7b9487f1-94bf-43f9-8062-7a10b45e0e2d' -- Onion
  AND location_area = 'Kurnool' AND quantity_kg = 800;
DELETE FROM public.crop_listings
WHERE owner_id = '177e32f1-10e9-41e6-a71f-e8a8d3bde1d4' -- Ramesh
  AND crop_id = '8bf39674-cb4e-47e7-8bd0-8321aed0074f' -- Groundnut
  AND location_area = 'Kadapa' AND quantity_kg = 1200;
DELETE FROM public.crop_listings
WHERE owner_id = 'c25872bd-b069-47d6-acb0-9af7502d14fc' -- Venkat
  AND crop_id = '8bf39674-cb4e-47e7-8bd0-8321aed0074f' -- Groundnut
  AND location_area = 'Kadapa' AND quantity_kg = 1000;
DELETE FROM public.crop_listings
WHERE owner_id = 'fd13a229-ff4f-4134-9b86-1d34721053e0' -- FPO
  AND crop_id = '8bf39674-cb4e-47e7-8bd0-8321aed0074f' -- Groundnut
  AND location_area = 'Kadapa' AND quantity_kg = 1300;
DELETE FROM public.crop_listings
WHERE owner_id = '177e32f1-10e9-41e6-a71f-e8a8d3bde1d4' -- Ramesh
  AND crop_id = 'd779a372-090b-460a-9f37-163b9c9ed529' -- Paddy
  AND location_area = 'Warangal' AND quantity_kg = 1500;
DELETE FROM public.crop_listings
WHERE owner_id = 'c25872bd-b069-47d6-acb0-9af7502d14fc' -- Venkat
  AND crop_id = 'd779a372-090b-460a-9f37-163b9c9ed529' -- Paddy
  AND location_area = 'Warangal' AND quantity_kg = 2000;
DELETE FROM public.crop_listings
WHERE owner_id = 'fd13a229-ff4f-4134-9b86-1d34721053e0' -- FPO
  AND crop_id = 'd779a372-090b-460a-9f37-163b9c9ed529' -- Paddy
  AND location_area = 'Warangal' AND quantity_kg = 2000;

-- 4. Insert new seed data
ALTER TABLE public.crop_listings DISABLE TRIGGER crop_listings_after_insert_cluster;

DO $$
DECLARE
  v_ramesh uuid := '177e32f1-10e9-41e6-a71f-e8a8d3bde1d4';
  v_venkat uuid := 'c25872bd-b069-47d6-acb0-9af7502d14fc';
  v_fpo uuid := 'fd13a229-ff4f-4134-9b86-1d34721053e0';
  v_krishna uuid := '308e0f6b-019c-4297-a1e5-f8978d15e94d';
  v_suresh uuid := '0fd7a359-b75b-4bbb-8442-e607a8f77707';
  v_tomato uuid := '5ce01cdd-052c-4c68-9fc8-6a9a0dcfb0dc';
  v_onion uuid := '7b9487f1-94bf-43f9-8062-7a10b45e0e2d';
  v_chilli uuid := '860e4dc8-953f-43fd-8739-77bf9217051d';
  v_groundnut uuid := '8bf39674-cb4e-47e7-8bd0-8321aed0074f';
  v_paddy uuid := 'd779a372-090b-460a-9f37-163b9c9ed529';

  -- Ramesh's unclustered listings (invitation targets)
  v_r_tomato uuid; v_r_onion uuid; v_r_chilli uuid;
  -- Other farmers' listings for invite clusters
  v_v_tomato uuid; v_f_tomato uuid;
  v_v_onion uuid; v_f_onion uuid; v_k_onion uuid;
  v_v_chilli uuid; v_f_chilli uuid; v_k_chilli uuid; v_s_chilli uuid;
  -- Listings for joined clusters
  v_r_groundnut uuid; v_v_groundnut uuid; v_f_groundnut uuid;
  v_r_paddy uuid; v_v_paddy uuid; v_f_paddy uuid; v_k_paddy uuid;
  -- Cluster IDs
  c_tomato uuid; c_onion uuid; c_chilli uuid; c_groundnut uuid; c_paddy uuid;
BEGIN
  -- Ramesh's unclustered listings (invitation targets)
  v_r_tomato := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, expected_harvest_date, is_visible)
  VALUES (v_r_tomato, v_ramesh, v_tomato, 40, 40, 'Upcoming', 'Kurnool', '2026-11-15', true);

  v_r_onion := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, harvested_at, is_visible)
  VALUES (v_r_onion, v_ramesh, v_onion, 35, 35, 'Harvested', 'Kurnool', '2026-11-08', true);

  v_r_chilli := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, expected_harvest_date, is_visible)
  VALUES (v_r_chilli, v_ramesh, v_chilli, 30, 30, 'Upcoming', 'Kurnool', '2026-11-10', true);

  -- Invite Cluster 1: Tomato in Kurnool (forming, 2 existing members)
  v_v_tomato := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, expected_harvest_date, is_visible)
  VALUES (v_v_tomato, v_venkat, v_tomato, 40, 40, 'Upcoming', 'Kurnool', '2026-11-12', true);
  v_f_tomato := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, expected_harvest_date, is_visible)
  VALUES (v_f_tomato, v_fpo, v_tomato, 35, 35, 'Upcoming', 'Kurnool', '2026-11-18', true);

  c_tomato := gen_random_uuid();
  INSERT INTO crop_clusters (id, crop_name, variety, location_area, harvest_window_start, harvest_window_end, overall_quality_grade, total_quantity, status, closes_at)
  VALUES (c_tomato, 'Tomato', 'Arka Rakshak', 'Kurnool', '2026-11-10', '2026-11-20', 'A', 75, 'forming', '2026-11-27'::timestamptz);
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent) VALUES (c_tomato, v_v_tomato, v_venkat, 40, 'A', 53.33);
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent) VALUES (c_tomato, v_f_tomato, v_fpo, 35, 'A', 46.67);

  -- Invite Cluster 2: Onion in Kurnool (forming, 3 existing members)
  v_v_onion := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, harvested_at, is_visible)
  VALUES (v_v_onion, v_venkat, v_onion, 30, 30, 'Harvested', 'Kurnool', '2026-11-05', true);
  v_f_onion := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, harvested_at, is_visible)
  VALUES (v_f_onion, v_fpo, v_onion, 25, 25, 'Harvested', 'Kurnool', '2026-11-10', true);
  v_k_onion := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, harvested_at, is_visible)
  VALUES (v_k_onion, v_krishna, v_onion, 35, 35, 'Harvested', 'Kurnool', '2026-11-07', true);

  c_onion := gen_random_uuid();
  INSERT INTO crop_clusters (id, crop_name, variety, location_area, harvest_window_start, harvest_window_end, overall_quality_grade, total_quantity, status, closes_at)
  VALUES (c_onion, 'Onion', 'Nasik Red', 'Kurnool', '2026-11-03', '2026-11-12', 'A', 90, 'forming', '2026-11-19'::timestamptz);
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent) VALUES (c_onion, v_v_onion, v_venkat, 30, 'A', 33.33);
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent) VALUES (c_onion, v_f_onion, v_fpo, 25, 'A', 27.78);
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent) VALUES (c_onion, v_k_onion, v_krishna, 35, 'A', 38.89);

  -- Invite Cluster 3: Chilli in Kurnool (forming, 4 existing members)
  v_v_chilli := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, expected_harvest_date, is_visible)
  VALUES (v_v_chilli, v_venkat, v_chilli, 20, 20, 'Upcoming', 'Kurnool', '2026-11-08', true);
  v_f_chilli := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, expected_harvest_date, is_visible)
  VALUES (v_f_chilli, v_fpo, v_chilli, 30, 30, 'Upcoming', 'Kurnool', '2026-11-12', true);
  v_k_chilli := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, expected_harvest_date, is_visible)
  VALUES (v_k_chilli, v_krishna, v_chilli, 25, 25, 'Upcoming', 'Kurnool', '2026-11-10', true);
  v_s_chilli := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, expected_harvest_date, is_visible)
  VALUES (v_s_chilli, v_suresh, v_chilli, 35, 35, 'Upcoming', 'Kurnool', '2026-11-06', true);

  c_chilli := gen_random_uuid();
  INSERT INTO crop_clusters (id, crop_name, variety, location_area, harvest_window_start, harvest_window_end, overall_quality_grade, total_quantity, status, closes_at)
  VALUES (c_chilli, 'Chilli', 'Byadagi', 'Kurnool', '2026-11-04', '2026-11-14', 'A', 110, 'forming', '2026-11-21'::timestamptz);
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent) VALUES (c_chilli, v_v_chilli, v_venkat, 20, 'A', 18.18);
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent) VALUES (c_chilli, v_f_chilli, v_fpo, 30, 'A', 27.27);
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent) VALUES (c_chilli, v_k_chilli, v_krishna, 25, 'A', 22.73);
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent) VALUES (c_chilli, v_s_chilli, v_suresh, 35, 'A', 31.82);

  -- Joined Cluster 4: Groundnut in Kadapa (ready, in transit, 3 members)
  v_r_groundnut := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, harvested_at, is_visible)
  VALUES (v_r_groundnut, v_ramesh, v_groundnut, 40, 40, 'Harvested', 'Kadapa', '2026-08-28', true);
  v_v_groundnut := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, harvested_at, is_visible)
  VALUES (v_v_groundnut, v_venkat, v_groundnut, 35, 35, 'Harvested', 'Kadapa', '2026-08-26', true);
  v_f_groundnut := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, harvested_at, is_visible)
  VALUES (v_f_groundnut, v_fpo, v_groundnut, 45, 45, 'Harvested', 'Kadapa', '2026-08-30', true);

  c_groundnut := gen_random_uuid();
  INSERT INTO crop_clusters (id, crop_name, variety, location_area, harvest_window_start, harvest_window_end, overall_quality_grade, total_quantity, status, closes_at, transport_status)
  VALUES (c_groundnut, 'Groundnut', 'TMV-2', 'Kadapa', '2026-08-26', '2026-08-30', 'A', 120, 'ready', '2026-09-06'::timestamptz, 'in_transit');
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent) VALUES (c_groundnut, v_r_groundnut, v_ramesh, 40, 'A', 33.33);
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent) VALUES (c_groundnut, v_v_groundnut, v_venkat, 35, 'A', 29.17);
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent) VALUES (c_groundnut, v_f_groundnut, v_fpo, 45, 'A', 37.50);

  -- Joined Cluster 5: Paddy in Warangal (sold, 4 members)
  v_r_paddy := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, harvested_at, is_visible)
  VALUES (v_r_paddy, v_ramesh, v_paddy, 50, 50, 'Harvested', 'Warangal', '2026-09-12', true);
  v_v_paddy := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, harvested_at, is_visible)
  VALUES (v_v_paddy, v_venkat, v_paddy, 40, 40, 'Harvested', 'Warangal', '2026-09-10', true);
  v_f_paddy := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, harvested_at, is_visible)
  VALUES (v_f_paddy, v_fpo, v_paddy, 45, 45, 'Harvested', 'Warangal', '2026-09-14', true);
  v_k_paddy := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, harvested_at, is_visible)
  VALUES (v_k_paddy, v_krishna, v_paddy, 35, 35, 'Harvested', 'Warangal', '2026-09-11', true);

  c_paddy := gen_random_uuid();
  INSERT INTO crop_clusters (id, crop_name, variety, location_area, harvest_window_start, harvest_window_end, overall_quality_grade, total_quantity, status, closes_at, transport_status)
  VALUES (c_paddy, 'Paddy', 'Sona Masuri', 'Warangal', '2026-09-10', '2026-09-14', 'A', 170, 'sold', '2026-09-21'::timestamptz, 'delivered');
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent) VALUES (c_paddy, v_r_paddy, v_ramesh, 50, 'A', 29.41);
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent) VALUES (c_paddy, v_v_paddy, v_venkat, 40, 'A', 23.53);
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent) VALUES (c_paddy, v_f_paddy, v_fpo, 45, 'A', 26.47);
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent) VALUES (c_paddy, v_k_paddy, v_krishna, 35, 'A', 20.59);
END;
$$;

ALTER TABLE public.crop_listings ENABLE TRIGGER crop_listings_after_insert_cluster;
