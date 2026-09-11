/*
# Cluster Farmer-Role Restriction

## Summary
Ensures only users with the Farmer role can be matched, invited, or included
in crop clusters. The auto_cluster_crop() trigger now skips any crop listing
whose owner does not have the Farmer role. The join_cluster() RPC now rejects
callers who are not Farmers. FPO, Storage Provider, Transport Provider, and
Buyer accounts are excluded entirely from cluster participation.

## Changes
1. auto_cluster_crop(): Added a role check at the top — looks up the owner's
   role in user_roles and returns early if it is not 'Farmer'.
2. join_cluster(): Added a role check after ownership validation — looks up
   the caller's role in user_roles and raises an exception if not 'Farmer'.
3. No schema/table changes — only function definitions updated.
*/

-- Update auto_cluster_crop() to skip non-Farmer owners
CREATE OR REPLACE FUNCTION public.auto_cluster_crop() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_crop_name     text;
  v_variety       text;
  v_location      text;
  v_harvest_date  date;
  v_cluster_id    uuid;
  v_total_qty     numeric(12,2);
  v_min_date      date;
  v_max_date      date;
  v_unclustered   int;
  v_member        record;
  v_owner_role    text;
BEGIN
  BEGIN
    -- Only cluster Upcoming or Harvested crops
    IF NEW.status NOT IN ('Upcoming', 'Harvested') THEN
      RETURN NEW;
    END IF;

    -- Only Farmer-role users can participate in clusters
    SELECT ur.role INTO v_owner_role
    FROM public.user_roles ur
    WHERE ur.user_id = NEW.owner_id;
    IF v_owner_role IS NULL OR v_owner_role <> 'Farmer' THEN
      RETURN NEW;
    END IF;

    -- Determine crop name and variety
    IF NEW.custom_crop_name IS NOT NULL THEN
      v_crop_name := NEW.custom_crop_name;
      v_variety := NULL;
    ELSE
      SELECT c.name, c.variety INTO v_crop_name, v_variety
      FROM public.crops c WHERE c.id = NEW.crop_id;
    END IF;

    v_location := NEW.location_area;
    v_harvest_date := COALESCE(NEW.expected_harvest_date, NEW.harvested_at);

    -- Cannot cluster without a harvest date
    IF v_harvest_date IS NULL THEN
      RETURN NEW;
    END IF;

    -- 1. Look for an existing matching cluster
    SELECT cc.id INTO v_cluster_id
    FROM public.crop_clusters cc
    WHERE lower(cc.crop_name) = lower(v_crop_name)
      AND lower(coalesce(cc.location_area, '')) = lower(coalesce(v_location, ''))
      AND cc.status IN ('forming', 'ready')
      AND v_harvest_date >= (cc.harvest_window_start - INTERVAL '7 days')::date
      AND v_harvest_date <= (cc.harvest_window_end + INTERVAL '7 days')::date
    ORDER BY abs(cc.harvest_window_start - v_harvest_date)
    LIMIT 1;

    IF v_cluster_id IS NOT NULL THEN
      -- Add the new crop as a member (skip if already a member)
      INSERT INTO public.crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent)
      VALUES (v_cluster_id, NEW.id, NEW.owner_id, NEW.quantity_kg, NULL, 0)
      ON CONFLICT (cluster_id, crop_id) DO NOTHING;

      -- Recalculate cluster totals from all members
      SELECT COALESCE(sum(m.quantity_contributed), 0),
             min(COALESCE(cl.expected_harvest_date, cl.harvested_at)),
             max(COALESCE(cl.expected_harvest_date, cl.harvested_at))
      INTO v_total_qty, v_min_date, v_max_date
      FROM public.crop_cluster_members m
      JOIN public.crop_listings cl ON cl.id = m.crop_id
      WHERE m.cluster_id = v_cluster_id;

      UPDATE public.crop_clusters
      SET total_quantity = v_total_qty,
          harvest_window_start = v_min_date,
          harvest_window_end = v_max_date,
          status = CASE WHEN v_total_qty >= 100 THEN 'ready' ELSE 'forming' END,
          closes_at = v_max_date + INTERVAL '7 days'
      WHERE id = v_cluster_id;

      -- Update payout shares proportionally
      IF v_total_qty > 0 THEN
        UPDATE public.crop_cluster_members
        SET payout_share_percent = round((quantity_contributed / v_total_qty) * 100, 2)
        WHERE cluster_id = v_cluster_id;
      END IF;

      RETURN NEW;
    END IF;

    -- 2. No matching cluster — check for 2+ unclustered similar crops nearby
    -- Only count crops owned by Farmers
    SELECT count(*) INTO v_unclustered
    FROM public.crop_listings cl
    LEFT JOIN public.crop_cluster_members m ON m.crop_id = cl.id
    WHERE m.id IS NULL
      AND cl.id <> NEW.id
      AND cl.status IN ('Upcoming', 'Harvested')
      AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = cl.owner_id AND ur.role = 'Farmer')
      AND (
        (cl.custom_crop_name IS NOT NULL AND lower(cl.custom_crop_name) = lower(v_crop_name))
        OR
        (cl.custom_crop_name IS NULL AND EXISTS (
          SELECT 1 FROM public.crops c WHERE c.id = cl.crop_id AND lower(c.name) = lower(v_crop_name)
        ))
      )
      AND lower(coalesce(cl.location_area, '')) = lower(coalesce(v_location, ''))
      AND COALESCE(cl.expected_harvest_date, cl.harvested_at) IS NOT NULL
      AND abs(COALESCE(cl.expected_harvest_date, cl.harvested_at) - v_harvest_date) <= 7;

    IF v_unclustered >= 2 THEN
      -- Compute harvest window across all matching crops + the new one
      SELECT min(hd), max(hd) INTO v_min_date, v_max_date
      FROM (
        SELECT COALESCE(cl.expected_harvest_date, cl.harvested_at) AS hd
        FROM public.crop_listings cl
        LEFT JOIN public.crop_cluster_members m ON m.crop_id = cl.id
        WHERE m.id IS NULL
          AND cl.id <> NEW.id
          AND cl.status IN ('Upcoming', 'Harvested')
          AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = cl.owner_id AND ur.role = 'Farmer')
          AND (
            (cl.custom_crop_name IS NOT NULL AND lower(cl.custom_crop_name) = lower(v_crop_name))
            OR
            (cl.custom_crop_name IS NULL AND EXISTS (
              SELECT 1 FROM public.crops c WHERE c.id = cl.crop_id AND lower(c.name) = lower(v_crop_name)
            ))
          )
          AND lower(coalesce(cl.location_area, '')) = lower(coalesce(v_location, ''))
          AND COALESCE(cl.expected_harvest_date, cl.harvested_at) IS NOT NULL
          AND abs(COALESCE(cl.expected_harvest_date, cl.harvested_at) - v_harvest_date) <= 7
        UNION ALL
        SELECT v_harvest_date
      ) dates;

      -- Create the cluster
      v_cluster_id := gen_random_uuid();
      v_total_qty := NEW.quantity_kg;

      INSERT INTO public.crop_clusters (id, crop_name, variety, location_area, harvest_window_start, harvest_window_end, overall_quality_grade, total_quantity, status, closes_at, transport_status)
      VALUES (v_cluster_id, v_crop_name, v_variety, v_location, v_min_date, v_max_date, 'A', v_total_qty, 'forming', v_max_date + INTERVAL '7 days', NULL);

      -- Add the new crop as a member
      INSERT INTO public.crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent)
      VALUES (v_cluster_id, NEW.id, NEW.owner_id, NEW.quantity_kg, NULL, 0);

      -- Add all matching unclustered Farmer crops as members
      FOR v_member IN
        SELECT cl.id, cl.owner_id, cl.quantity_kg
        FROM public.crop_listings cl
        LEFT JOIN public.crop_cluster_members m ON m.crop_id = cl.id
        WHERE m.id IS NULL
          AND cl.id <> NEW.id
          AND cl.status IN ('Upcoming', 'Harvested')
          AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = cl.owner_id AND ur.role = 'Farmer')
          AND (
            (cl.custom_crop_name IS NOT NULL AND lower(cl.custom_crop_name) = lower(v_crop_name))
            OR
            (cl.custom_crop_name IS NULL AND EXISTS (
              SELECT 1 FROM public.crops c WHERE c.id = cl.crop_id AND lower(c.name) = lower(v_crop_name)
            ))
          )
          AND lower(coalesce(cl.location_area, '')) = lower(coalesce(v_location, ''))
          AND COALESCE(cl.expected_harvest_date, cl.harvested_at) IS NOT NULL
          AND abs(COALESCE(cl.expected_harvest_date, cl.harvested_at) - v_harvest_date) <= 7
      LOOP
        INSERT INTO public.crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent)
        VALUES (v_cluster_id, v_member.id, v_member.owner_id, v_member.quantity_kg, NULL, 0)
        ON CONFLICT (cluster_id, crop_id) DO NOTHING;

        v_total_qty := v_total_qty + v_member.quantity_kg;
      END LOOP;

      -- Update cluster totals
      UPDATE public.crop_clusters
      SET total_quantity = v_total_qty,
          harvest_window_start = v_min_date,
          harvest_window_end = v_max_date,
          status = CASE WHEN v_total_qty >= 100 THEN 'ready' ELSE 'forming' END,
          closes_at = v_max_date + INTERVAL '7 days'
      WHERE id = v_cluster_id;

      -- Update payout shares proportionally
      IF v_total_qty > 0 THEN
        UPDATE public.crop_cluster_members
        SET payout_share_percent = round((quantity_contributed / v_total_qty) * 100, 2)
        WHERE cluster_id = v_cluster_id;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Clustering is background enhancement — never fail the crop creation
    NULL;
  END;

  RETURN NEW;
END;
$$;

-- Update join_cluster() to reject non-Farmer callers
CREATE OR REPLACE FUNCTION public.join_cluster(p_cluster_id uuid, p_crop_listing_id uuid)
RETURNS public.crop_clusters
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_listing     public.crop_listings%ROWTYPE;
  v_cluster     public.crop_clusters%ROWTYPE;
  v_crop_name   text;
  v_harvest     date;
  v_total_qty   numeric(12,2);
  v_min_date    date;
  v_max_date    date;
  v_farmer_id   uuid;
  v_caller_role text;
BEGIN
  -- Get the listing, ensure the calling user owns it
  SELECT * INTO v_listing FROM public.crop_listings WHERE id = p_crop_listing_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Crop listing not found';
  END IF;
  IF v_listing.owner_id != auth.uid() THEN
    RAISE EXCEPTION 'You can only join with your own crop listing';
  END IF;
  IF v_listing.status NOT IN ('Upcoming', 'Harvested') THEN
    RAISE EXCEPTION 'Only upcoming or harvested crops can join a cluster';
  END IF;

  -- Only Farmer-role users can join clusters
  SELECT ur.role INTO v_caller_role
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid();
  IF v_caller_role IS NULL OR v_caller_role <> 'Farmer' THEN
    RAISE EXCEPTION 'Only farmers can join crop clusters';
  END IF;

  -- Get the cluster
  SELECT * INTO v_cluster FROM public.crop_clusters WHERE id = p_cluster_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cluster not found';
  END IF;
  IF v_cluster.status NOT IN ('forming', 'ready') THEN
    RAISE EXCEPTION 'This cluster is no longer accepting members';
  END IF;

  -- Check the listing is not already in any cluster
  IF EXISTS (SELECT 1 FROM public.crop_cluster_members WHERE crop_id = p_crop_listing_id) THEN
    RAISE EXCEPTION 'This crop listing is already in a cluster';
  END IF;

  -- Validate crop name match
  IF v_listing.custom_crop_name IS NOT NULL THEN
    v_crop_name := v_listing.custom_crop_name;
  ELSE
    SELECT c.name INTO v_crop_name FROM public.crops c WHERE c.id = v_listing.crop_id;
  END IF;
  IF lower(coalesce(v_crop_name, '')) != lower(coalesce(v_cluster.crop_name, '')) THEN
    RAISE EXCEPTION 'Crop name does not match the cluster';
  END IF;

  -- Validate location match
  IF lower(coalesce(v_listing.location_area, '')) != lower(coalesce(v_cluster.location_area, '')) THEN
    RAISE EXCEPTION 'Location does not match the cluster';
  END IF;

  -- Validate harvest window overlap (within 7 days of cluster window)
  v_harvest := COALESCE(v_listing.expected_harvest_date, v_listing.harvested_at);
  IF v_harvest IS NULL THEN
    RAISE EXCEPTION 'Crop listing has no harvest date';
  END IF;
  IF v_harvest < (v_cluster.harvest_window_start - INTERVAL '7 days')::date
     OR v_harvest > (v_cluster.harvest_window_end + INTERVAL '7 days')::date THEN
    RAISE EXCEPTION 'Harvest date is outside the cluster window';
  END IF;

  -- Add the listing as a cluster member
  INSERT INTO public.crop_cluster_members (cluster_id, crop_id, farmer_id, quantity_contributed, quality_grade, payout_share_percent)
  VALUES (p_cluster_id, p_crop_listing_id, v_listing.owner_id, v_listing.quantity_kg, NULL, 0)
  ON CONFLICT (cluster_id, crop_id) DO NOTHING;

  -- Recalculate cluster totals
  SELECT COALESCE(sum(m.quantity_contributed), 0),
         min(COALESCE(cl.expected_harvest_date, cl.harvested_at)),
         max(COALESCE(cl.expected_harvest_date, cl.harvested_at))
  INTO v_total_qty, v_min_date, v_max_date
  FROM public.crop_cluster_members m
  JOIN public.crop_listings cl ON cl.id = m.crop_id
  WHERE m.cluster_id = p_cluster_id;

  UPDATE public.crop_clusters
  SET total_quantity = v_total_qty,
      harvest_window_start = v_min_date,
      harvest_window_end = v_max_date,
      status = CASE WHEN v_total_qty >= 100 THEN 'ready' ELSE 'forming' END,
      closes_at = v_max_date + INTERVAL '7 days'
  WHERE id = p_cluster_id;

  -- Update payout shares proportionally
  IF v_total_qty > 0 THEN
    UPDATE public.crop_cluster_members
    SET payout_share_percent = round((quantity_contributed / v_total_qty) * 100, 2)
    WHERE cluster_id = p_cluster_id;
  END IF;

  -- Return the updated cluster
  SELECT * INTO v_cluster FROM public.crop_clusters WHERE id = p_cluster_id;
  RETURN v_cluster;
END;
$$;
