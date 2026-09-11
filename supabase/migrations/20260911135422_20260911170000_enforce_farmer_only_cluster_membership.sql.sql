/*
# Enforce Farmer-Only Cluster Membership

## Summary
Fixes demo seed data that inserted non-Farmer users (Buyer, FPO, Storage
Provider, Transport Provider) as cluster members. Also adds an is_farmer()
helper function and tightens RLS policies on crop_clusters and
crop_cluster_members so only Farmer-role users can read cluster data.

## Problems Found
1. The auto_cluster_crop() trigger was already fixed in a prior migration
   to skip non-Farmer owners, but the demo seed data (reset migration)
   inserted non-Farmer users as cluster members directly, bypassing the
   trigger. The database currently has 16 cluster member rows, of which
   only 2 belong to Farmer-role users — the rest are Buyer, FPO, Storage
   Provider, and Transport Provider accounts.
2. RLS policies on crop_clusters and crop_cluster_members use
   USING (true) — any authenticated user can read all cluster data
   regardless of role. Non-farmer roles should not see cluster data.

## Changes
1. Create is_farmer(uuid) helper function — returns true if the given
   user_id has the 'Farmer' role in user_roles.
2. Delete all crop_cluster_members rows where the farmer_id does NOT
   have the Farmer role. This removes 14 non-farmer member rows.
3. Re-seed the cleaned clusters with Farmer-role members using the
   existing Ramesh Farmer account, so each cluster still has meaningful
   demo data. Ramesh's listing quantities are used for each cluster.
4. Recalculate total_quantity and payout_share_percent for each cluster
   after membership cleanup.
5. RLS: Replace USING(true) SELECT policies on crop_clusters and
   crop_cluster_members with a role check — only Farmer-role users
   (is_farmer(auth.uid())) can SELECT from these tables. INSERT/UPDATE/
   DELETE remain denied to authenticated (all mutations go through
   SECURITY DEFINER functions).
*/

-- 1. Create is_farmer() helper function
CREATE OR REPLACE FUNCTION public.is_farmer(p_user_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p_user_id AND ur.role = 'Farmer'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_farmer(uuid) TO authenticated;

-- 2. Delete non-farmer cluster members
DELETE FROM public.crop_cluster_members ccm
WHERE NOT public.is_farmer(ccm.farmer_id);

-- 3. Re-seed Farmer members for clusters that now have 0 or 1 members
--    We add Ramesh (the Farmer) to each cluster that he's not already in,
--    using realistic small-farmer quantities. Ramesh's user_id:
--    177e32f1-10e9-41e6-a71f-e8a8d3bde1d4
DO $$
DECLARE
  v_ramesh uuid := '177e32f1-10e9-41e6-a71f-e8a8d3bde1d4';
  v_cluster record;
  v_count int;
  v_existing_crop_id uuid;
  v_qty numeric(12,2);
BEGIN
  FOR v_cluster IN SELECT id, crop_name, location_area FROM public.crop_clusters LOOP
    -- Count current farmer members
    SELECT count(*) INTO v_count
    FROM public.crop_cluster_members
    WHERE cluster_id = v_cluster.id;

    -- Check if Ramesh is already a member
    SELECT crop_id INTO v_existing_crop_id
    FROM public.crop_cluster_members
    WHERE cluster_id = v_cluster.id AND farmer_id = v_ramesh;

    IF v_existing_crop_id IS NULL THEN
      -- Create a crop listing for Ramesh in this cluster if he doesn't have one
      -- Find or create a matching crop listing
      SELECT cl.id INTO v_existing_crop_id
      FROM public.crop_listings cl
      WHERE cl.owner_id = v_ramesh
        AND cl.status IN ('Upcoming', 'Harvested')
        AND (
          (cl.custom_crop_name IS NOT NULL AND lower(cl.custom_crop_name) = lower(v_cluster.crop_name))
          OR
          (cl.custom_crop_name IS NULL AND EXISTS (
            SELECT 1 FROM public.crops c WHERE c.id = cl.crop_id AND lower(c.name) = lower(v_cluster.crop_name)
          ))
        )
        AND lower(coalesce(cl.location_area, '')) = lower(coalesce(v_cluster.location_area, ''))
      LIMIT 1;

      -- If no matching listing exists, create one
      IF v_existing_crop_id IS NULL THEN
        v_qty := CASE
          WHEN v_cluster.crop_name = 'Tomato' THEN 120
          WHEN v_cluster.crop_name = 'Onion' THEN 80
          WHEN v_cluster.crop_name = 'Chilli' THEN 60
          WHEN v_cluster.crop_name = 'Groundnut' THEN 150
          WHEN v_cluster.crop_name = 'Paddy' THEN 200
          ELSE 100
        END;

        -- Find the crop_id from crops table
        DECLARE v_crop_id uuid;
        BEGIN
          SELECT c.id INTO v_crop_id FROM public.crops c WHERE lower(c.name) = lower(v_cluster.crop_name) LIMIT 1;

          INSERT INTO public.crop_listings (id, owner_id, crop_id, custom_crop_name, quantity_kg, available_quantity, status, location_area, expected_harvest_date)
          VALUES (gen_random_uuid(), v_ramesh, v_crop_id, NULL, v_qty, v_qty, 'Harvested', v_cluster.location_area, v_cluster.harvest_window_start);

          v_existing_crop_id := (SELECT id FROM public.crop_listings WHERE owner_id = v_ramesh AND quantity_kg = v_qty AND location_area = v_cluster.location_area ORDER BY created_at DESC LIMIT 1);
        END;
      END IF;

      -- Get quantity from the listing
      SELECT quantity_kg INTO v_qty FROM public.crop_listings WHERE id = v_existing_crop_id;

      -- Add Ramesh as a member
      INSERT INTO public.crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent)
      VALUES (v_cluster.id, v_existing_crop_id, v_ramesh, v_qty, NULL, 0)
      ON CONFLICT (cluster_id, crop_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- 4. Recalculate cluster totals and payout shares for all clusters
DO $$
DECLARE
  v_cluster record;
  v_total numeric(12,2);
  v_min_date date;
  v_max_date date;
BEGIN
  FOR v_cluster IN SELECT id FROM public.crop_clusters LOOP
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
        status = CASE WHEN v_total >= 100 THEN 'ready' ELSE 'forming' END,
        closes_at = v_max_date + INTERVAL '7 days'
    WHERE id = v_cluster.id;

    IF v_total > 0 THEN
      UPDATE public.crop_cluster_members
      SET payout_share_percent = round((quantity_contributed / v_total) * 100, 2)
      WHERE cluster_id = v_cluster.id;
    END IF;
  END LOOP;
END $$;

-- 5. Tighten RLS: only Farmer-role users can SELECT cluster data
DROP POLICY IF EXISTS "clusters_select" ON public.crop_clusters;
CREATE POLICY "clusters_select" ON public.crop_clusters
  FOR SELECT TO authenticated
  USING (public.is_farmer(auth.uid()));

DROP POLICY IF EXISTS "members_select" ON public.crop_cluster_members;
CREATE POLICY "members_select" ON public.crop_cluster_members
  FOR SELECT TO authenticated
  USING (public.is_farmer(auth.uid()));
