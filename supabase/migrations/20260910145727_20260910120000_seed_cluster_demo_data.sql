
-- Seed demo cluster data: 2 pending invitations + 3 joined clusters (ready, in-transit, sold)
-- Disable auto-cluster trigger during seeding to prevent interference
ALTER TABLE public.crop_listings DISABLE TRIGGER crop_listings_after_insert_cluster;

DO $$
DECLARE
  v_ramesh uuid := '177e32f1-10e9-41e6-a71f-e8a8d3bde1d4';
  v_venkat uuid := 'c25872bd-b069-47d6-acb0-9af7502d14fc';
  v_fpo uuid := 'fd13a229-ff4f-4134-9b86-1d34721053e0';
  v_tomato_crop uuid := '5ce01cdd-052c-4c68-9fc8-6a9a0dcfb0dc';
  v_onion_crop uuid := '7b9487f1-94bf-43f9-8062-7a10b45e0e2d';
  v_groundnut_crop uuid := '8bf39674-cb4e-47e7-8bd0-8321aed0074f';
  v_paddy_crop uuid := 'd779a372-090b-460a-9f37-163b9c9ed529';
  v_r_tomato uuid; v_r_onion uuid; v_r_groundnut uuid; v_r_paddy uuid;
  v_v_tomato uuid; v_f_tomato uuid; v_v_onion uuid; v_f_onion uuid;
  v_v_groundnut uuid; v_f_groundnut uuid; v_v_paddy uuid; v_f_paddy uuid;
  c_invite_t uuid; c_invite_o uuid; c_intransit uuid; c_sold uuid;
BEGIN
  -- Other farmers' listings in Kurnool (for invitation cluster members)
  v_v_tomato := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, expected_harvest_date, is_visible)
  VALUES (v_v_tomato, v_venkat, v_tomato_crop, 400, 400, 'Upcoming', 'Kurnool', '2026-11-12', true);
  v_f_tomato := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, expected_harvest_date, is_visible)
  VALUES (v_f_tomato, v_fpo, v_tomato_crop, 300, 300, 'Upcoming', 'Kurnool', '2026-11-18', true);
  v_v_onion := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, harvested_at, is_visible)
  VALUES (v_v_onion, v_venkat, v_onion_crop, 500, 500, 'Harvested', 'Kurnool', '2026-11-05', true);
  v_f_onion := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, harvested_at, is_visible)
  VALUES (v_f_onion, v_fpo, v_onion_crop, 400, 400, 'Harvested', 'Kurnool', '2026-11-10', true);

  -- Ramesh's unclustered listings in Kurnool (invitation targets)
  v_r_tomato := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, expected_harvest_date, is_visible)
  VALUES (v_r_tomato, v_ramesh, v_tomato_crop, 500, 500, 'Upcoming', 'Kurnool', '2026-11-15', true);
  v_r_onion := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, harvested_at, is_visible)
  VALUES (v_r_onion, v_ramesh, v_onion_crop, 800, 800, 'Harvested', 'Kurnool', '2026-11-08', true);

  -- Listings for joined clusters
  v_r_groundnut := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, harvested_at, is_visible)
  VALUES (v_r_groundnut, v_ramesh, v_groundnut_crop, 1200, 1200, 'Harvested', 'Kadapa', '2026-08-28', true);
  v_v_groundnut := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, harvested_at, is_visible)
  VALUES (v_v_groundnut, v_venkat, v_groundnut_crop, 1000, 1000, 'Harvested', 'Kadapa', '2026-08-26', true);
  v_f_groundnut := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, harvested_at, is_visible)
  VALUES (v_f_groundnut, v_fpo, v_groundnut_crop, 1300, 1300, 'Harvested', 'Kadapa', '2026-08-30', true);
  v_r_paddy := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, harvested_at, is_visible)
  VALUES (v_r_paddy, v_ramesh, v_paddy_crop, 1500, 1500, 'Harvested', 'Warangal', '2026-09-12', true);
  v_v_paddy := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, harvested_at, is_visible)
  VALUES (v_v_paddy, v_venkat, v_paddy_crop, 2000, 2000, 'Harvested', 'Warangal', '2026-09-10', true);
  v_f_paddy := gen_random_uuid();
  INSERT INTO crop_listings (id, owner_id, crop_id, quantity_kg, available_quantity_kg, status, location_area, harvested_at, is_visible)
  VALUES (v_f_paddy, v_fpo, v_paddy_crop, 2000, 2000, 'Harvested', 'Warangal', '2026-09-14', true);

  -- Invitation Cluster 1: Tomato in Kurnool (forming)
  c_invite_t := gen_random_uuid();
  INSERT INTO crop_clusters (id, crop_name, variety, location_area, harvest_window_start, harvest_window_end, overall_quality_grade, total_quantity, status, closes_at)
  VALUES (c_invite_t, 'Tomato', 'Arka Rakshak', 'Kurnool', '2026-11-10', '2026-11-20', 'A', 700, 'forming', '2026-11-27'::timestamptz);
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent) VALUES (c_invite_t, v_v_tomato, v_venkat, 400, 'A', 57.14);
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent) VALUES (c_invite_t, v_f_tomato, v_fpo, 300, 'A', 42.86);

  -- Invitation Cluster 2: Onion in Kurnool (forming)
  c_invite_o := gen_random_uuid();
  INSERT INTO crop_clusters (id, crop_name, variety, location_area, harvest_window_start, harvest_window_end, overall_quality_grade, total_quantity, status, closes_at)
  VALUES (c_invite_o, 'Onion', 'Nasik Red', 'Kurnool', '2026-11-03', '2026-11-12', 'A', 900, 'forming', '2026-11-19'::timestamptz);
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent) VALUES (c_invite_o, v_v_onion, v_venkat, 500, 'A', 55.56);
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent) VALUES (c_invite_o, v_f_onion, v_fpo, 400, 'A', 44.44);

  -- Joined Cluster 3: Groundnut in Kadapa (ready, in transit)
  c_intransit := gen_random_uuid();
  INSERT INTO crop_clusters (id, crop_name, variety, location_area, harvest_window_start, harvest_window_end, overall_quality_grade, total_quantity, status, closes_at, transport_status)
  VALUES (c_intransit, 'Groundnut', 'TMV-2', 'Kadapa', '2026-08-26', '2026-08-30', 'A', 3500, 'ready', '2026-09-06'::timestamptz, 'in_transit');
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent) VALUES (c_intransit, v_r_groundnut, v_ramesh, 1200, 'A', 34.29);
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent) VALUES (c_intransit, v_v_groundnut, v_venkat, 1000, 'A', 28.57);
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent) VALUES (c_intransit, v_f_groundnut, v_fpo, 1300, 'A', 37.14);

  -- Joined Cluster 4: Paddy in Warangal (sold)
  c_sold := gen_random_uuid();
  INSERT INTO crop_clusters (id, crop_name, variety, location_area, harvest_window_start, harvest_window_end, overall_quality_grade, total_quantity, status, closes_at, transport_status)
  VALUES (c_sold, 'Paddy', 'Sona Masuri', 'Warangal', '2026-09-10', '2026-09-14', 'A', 5500, 'sold', '2026-09-21'::timestamptz, 'delivered');
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent) VALUES (c_sold, v_r_paddy, v_ramesh, 1500, 'A', 27.27);
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent) VALUES (c_sold, v_v_paddy, v_venkat, 2000, 'A', 36.36);
  INSERT INTO crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent) VALUES (c_sold, v_f_paddy, v_fpo, 2000, 'A', 36.36);
END;
$$;

ALTER TABLE public.crop_listings ENABLE TRIGGER crop_listings_after_insert_cluster;
