/*
# Seed crop_clusters and crop_cluster_members

## Purpose
Create 5 clusters with varied member counts and statuses. For each cluster
contribution, a NEW crop_listing is created with is_cluster_linked=true.

## Key schema note
crop_cluster_members.crop_id is a FK to crop_listings(id) (the specific
listing), NOT to crops(id). The unique constraint on (cluster_id, crop_id)
ensures one listing per cluster. Member rows must reference the actual
crop_listing UUID.

## Clusters created
1. Tomato — forming — Warangal — 2 joined (Ramesh Kumar 80kg, Anjali Reddy 75kg)
2. Onion — forming — Nalgonda — 1 joined (Prasad Rao 60kg) + 1 pending invite (Ramesh Kumar 70kg)
3. Groundnut — sold — Warangal — 3 joined (Ramesh Kumar 90kg, Lakshmi Devi 55kg, Anjali Reddy 65kg)
   with price-clock fields populated
4. Paddy — forming — Nalgonda — 0 joined, 2 pending invites (Prasad Rao 85kg, Ramesh Kumar 75kg)
5. Onion — forming — Khammam — 1 joined (Lakshmi Devi 50kg) + 1 pending invite (Anjali Reddy 60kg)

## Pending invite mechanism
A pending invite = cluster-contribution crop_listing exists (is_cluster_linked=true,
status=Upcoming) matching the cluster by crop name + location + harvest window,
but NO row in crop_cluster_members for that farmer+cluster.

## Important notes
1. auto_cluster_crop trigger temporarily disabled during seeding.
2. populate_price_clock trigger fires on UPDATE to Sold for cluster 3's listings.
3. No existing standalone listing is modified.
4. Uses DO block to capture listing UUIDs for member insertion.
*/

-- Disable auto-cluster trigger during seeding
ALTER TABLE crop_listings DISABLE TRIGGER crop_listings_after_insert_cluster;

DO $$
DECLARE
  -- Farmer IDs
  v_ramesh   uuid := '177e32f1-10e9-41e6-a71f-e8a8d3bde1d4';
  v_lakshmi  uuid := 'f38e4d09-d277-4d60-a0ce-13ef511b82fa';
  v_anjali   uuid := 'aaf802b7-ac30-4340-9acd-e804d0a46644';
  v_prasad   uuid := 'a266a127-f8cb-4f8c-a03a-c7378aa59f09';
  -- Crop IDs
  v_tomato     uuid := '5ce01cdd-052c-4c68-9fc8-6a9a0dcfb0dc';
  v_onion      uuid := '7b9487f1-94bf-43f9-8062-7a10b45e0e2d';
  v_groundnut  uuid := '8bf39674-cb4e-47e7-8bd0-8321aed0074f';
  v_paddy      uuid := 'd779a372-090b-460a-9f37-163b9c9ed529';
  -- Cluster IDs
  v_c1 uuid;  v_c2 uuid;  v_c3 uuid;  v_c4 uuid;  v_c5 uuid;
  -- Listing IDs for members
  v_l_ramesh_tomato   uuid;
  v_l_anjali_tomato   uuid;
  v_l_prasad_onion_n  uuid;
  v_l_ramesh_onion_n  uuid;
  v_l_ramesh_gnut     uuid;
  v_l_lakshmi_gnut    uuid;
  v_l_anjali_gnut     uuid;
  v_l_prasad_paddy    uuid;
  v_l_ramesh_paddy    uuid;
  v_l_lakshmi_onion_k uuid;
  v_l_anjali_onion_k  uuid;
BEGIN
  -- ============================================================
  -- CLUSTER 1: Tomato — forming — Warangal — 2 joined
  -- ============================================================
  INSERT INTO crop_clusters (crop_name, variety, location_area, harvest_window_start, harvest_window_end, overall_quality_grade, total_quantity, status, transport_cost, storage_cost)
  VALUES ('Tomato', 'Arka Rakshak', 'Warangal', '2026-10-10', '2026-10-25', 'A', 155, 'forming', 1200, 800)
  RETURNING id INTO v_c1;

  INSERT INTO crop_listings (owner_id, crop_id, quantity_kg, available_quantity_kg, expected_harvest_date, location_area, indicative_price_per_kg, status, is_cluster_linked, is_visible)
  VALUES (v_ramesh, v_tomato, 80, 80, '2026-10-15', 'Warangal', 30.00, 'Upcoming', true, true)
  RETURNING id INTO v_l_ramesh_tomato;

  INSERT INTO crop_listings (owner_id, crop_id, quantity_kg, available_quantity_kg, expected_harvest_date, location_area, indicative_price_per_kg, status, is_cluster_linked, is_visible)
  VALUES (v_anjali, v_tomato, 75, 75, '2026-10-18', 'Warangal', 30.00, 'Upcoming', true, true)
  RETURNING id INTO v_l_anjali_tomato;

  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent)
  VALUES (v_c1, v_l_ramesh_tomato, v_ramesh, 80, 'A', 51.61);
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent)
  VALUES (v_c1, v_l_anjali_tomato, v_anjali, 75, 'A', 48.39);

  -- ============================================================
  -- CLUSTER 2: Onion — forming — Nalgonda — 1 joined + 1 pending invite
  -- ============================================================
  INSERT INTO crop_clusters (crop_name, variety, location_area, harvest_window_start, harvest_window_end, overall_quality_grade, total_quantity, status, transport_cost, storage_cost)
  VALUES ('Onion', 'Nasik Red', 'Nalgonda', '2026-10-12', '2026-10-22', 'B', 60, 'forming', 900, 600)
  RETURNING id INTO v_c2;

  -- Prasad Rao joined
  INSERT INTO crop_listings (owner_id, crop_id, quantity_kg, available_quantity_kg, expected_harvest_date, location_area, indicative_price_per_kg, status, is_cluster_linked, is_visible)
  VALUES (v_prasad, v_onion, 60, 60, '2026-10-16', 'Nalgonda', 26.00, 'Upcoming', true, true)
  RETURNING id INTO v_l_prasad_onion_n;

  -- Ramesh Kumar pending invite (no member row)
  INSERT INTO crop_listings (owner_id, crop_id, quantity_kg, available_quantity_kg, expected_harvest_date, location_area, indicative_price_per_kg, status, is_cluster_linked, is_visible)
  VALUES (v_ramesh, v_onion, 70, 70, '2026-10-18', 'Nalgonda', 26.00, 'Upcoming', true, true)
  RETURNING id INTO v_l_ramesh_onion_n;

  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent)
  VALUES (v_c2, v_l_prasad_onion_n, v_prasad, 60, 'B', 100.0);

  -- ============================================================
  -- CLUSTER 3: Groundnut — sold — Warangal — 3 joined, price-clock
  -- ============================================================
  INSERT INTO crop_clusters (crop_name, variety, location_area, harvest_window_start, harvest_window_end, overall_quality_grade, total_quantity, status, transport_cost, storage_cost,
    price_start_per_kg, price_floor_per_kg, decay_speed, price_drop_started_at, step_interval_minutes, step_drop_amount)
  VALUES ('Groundnut', 'TMV-2', 'Warangal', '2026-09-01', '2026-09-15', 'A', 210, 'sold', 1500, 1000,
    50.00, 35.00, 'slow', now(), 45, 1.88)
  RETURNING id INTO v_c3;

  -- Insert as Upcoming, then UPDATE to Sold for price-clock trigger
  INSERT INTO crop_listings (owner_id, crop_id, quantity_kg, available_quantity_kg, harvested_at, location_area, indicative_price_per_kg, status, is_cluster_linked, is_visible)
  VALUES (v_ramesh, v_groundnut, 90, 90, '2026-09-08', 'Warangal', 50.00, 'Upcoming', true, true)
  RETURNING id INTO v_l_ramesh_gnut;

  INSERT INTO crop_listings (owner_id, crop_id, quantity_kg, available_quantity_kg, harvested_at, location_area, indicative_price_per_kg, status, is_cluster_linked, is_visible)
  VALUES (v_lakshmi, v_groundnut, 55, 55, '2026-09-10', 'Warangal', 50.00, 'Upcoming', true, true)
  RETURNING id INTO v_l_lakshmi_gnut;

  INSERT INTO crop_listings (owner_id, crop_id, quantity_kg, available_quantity_kg, harvested_at, location_area, indicative_price_per_kg, status, is_cluster_linked, is_visible)
  VALUES (v_anjali, v_groundnut, 65, 65, '2026-09-12', 'Warangal', 50.00, 'Upcoming', true, true)
  RETURNING id INTO v_l_anjali_gnut;

  -- Trigger price-clock by updating to Sold
  UPDATE crop_listings SET status = 'Sold' WHERE id = v_l_ramesh_gnut;
  UPDATE crop_listings SET status = 'Sold' WHERE id = v_l_lakshmi_gnut;
  UPDATE crop_listings SET status = 'Sold' WHERE id = v_l_anjali_gnut;

  -- Add members with proportional payout shares
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent)
  VALUES (v_c3, v_l_ramesh_gnut, v_ramesh, 90, 'A', 42.86);
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent)
  VALUES (v_c3, v_l_lakshmi_gnut, v_lakshmi, 55, 'A', 26.19);
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent)
  VALUES (v_c3, v_l_anjali_gnut, v_anjali, 65, 'A', 30.95);

  -- ============================================================
  -- CLUSTER 4: Paddy — forming — Nalgonda — 0 joined, 2 pending invites
  -- ============================================================
  INSERT INTO crop_clusters (crop_name, variety, location_area, harvest_window_start, harvest_window_end, overall_quality_grade, total_quantity, status, transport_cost, storage_cost)
  VALUES ('Paddy', 'Sona Masuri', 'Nalgonda', '2026-11-01', '2026-11-15', 'A', 0, 'forming', 1100, 700)
  RETURNING id INTO v_c4;

  -- Prasad Rao pending invite (no member row)
  INSERT INTO crop_listings (owner_id, crop_id, quantity_kg, available_quantity_kg, expected_harvest_date, location_area, indicative_price_per_kg, status, is_cluster_linked, is_visible)
  VALUES (v_prasad, v_paddy, 85, 85, '2026-11-08', 'Nalgonda', 22.00, 'Upcoming', true, true)
  RETURNING id INTO v_l_prasad_paddy;

  -- Ramesh Kumar pending invite (no member row)
  INSERT INTO crop_listings (owner_id, crop_id, quantity_kg, available_quantity_kg, expected_harvest_date, location_area, indicative_price_per_kg, status, is_cluster_linked, is_visible)
  VALUES (v_ramesh, v_paddy, 75, 75, '2026-11-10', 'Nalgonda', 22.00, 'Upcoming', true, true)
  RETURNING id INTO v_l_ramesh_paddy;

  -- ============================================================
  -- CLUSTER 5: Onion — forming — Khammam — 1 joined + 1 pending invite
  -- ============================================================
  INSERT INTO crop_clusters (crop_name, variety, location_area, harvest_window_start, harvest_window_end, overall_quality_grade, total_quantity, status, transport_cost, storage_cost)
  VALUES ('Onion', 'Nasik Red', 'Khammam', '2026-10-15', '2026-10-25', 'A', 50, 'forming', 800, 500)
  RETURNING id INTO v_c5;

  -- Lakshmi Devi joined
  INSERT INTO crop_listings (owner_id, crop_id, quantity_kg, available_quantity_kg, expected_harvest_date, location_area, indicative_price_per_kg, status, is_cluster_linked, is_visible)
  VALUES (v_lakshmi, v_onion, 50, 50, '2026-10-20', 'Khammam', 25.00, 'Upcoming', true, true)
  RETURNING id INTO v_l_lakshmi_onion_k;

  -- Anjali Reddy pending invite (no member row)
  INSERT INTO crop_listings (owner_id, crop_id, quantity_kg, available_quantity_kg, expected_harvest_date, location_area, indicative_price_per_kg, status, is_cluster_linked, is_visible)
  VALUES (v_anjali, v_onion, 60, 60, '2026-10-22', 'Khammam', 25.00, 'Upcoming', true, true)
  RETURNING id INTO v_l_anjali_onion_k;

  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent)
  VALUES (v_c5, v_l_lakshmi_onion_k, v_lakshmi, 50, 'A', 100.0);
END $$;

-- Re-enable auto-cluster trigger
ALTER TABLE crop_listings ENABLE TRIGGER crop_listings_after_insert_cluster;