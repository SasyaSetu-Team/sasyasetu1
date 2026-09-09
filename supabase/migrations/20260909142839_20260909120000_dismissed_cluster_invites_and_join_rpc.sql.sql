/*
# Farmer Cluster Join + Dismiss Invites

## Summary
Adds a dismissed_cluster_invites table so farmers can dismiss cluster invites
without them reappearing, and a SECURITY DEFINER RPC function join_cluster() that
adds a farmer's existing crop listing as a cluster member (recomputing cluster
totals and farmer_count). This is needed because RLS denies all direct DML on
cluster tables — only the trigger and this RPC can mutate them.

## New Tables
1. dismissed_cluster_invites
   - id (uuid PK)
   - farmer_id (uuid FK -> auth.users ON DELETE CASCADE)
   - cluster_id (uuid FK -> crop_clusters ON DELETE CASCADE)
   - created_at (timestamptz)
   - UNIQUE (farmer_id, cluster_id)

## Security
- RLS enabled on dismissed_cluster_invites.
- Farmers can SELECT/INSERT only their own dismissals (auth.uid() = farmer_id).
- join_cluster() is SECURITY DEFINER, callable by authenticated. It validates
  that the calling farmer owns the crop listing being added, that the listing
  matches the cluster (same crop name + location_area + overlapping harvest),
  and that the listing is not already a member of any cluster.
*/

-- Create dismissed_cluster_invites table
CREATE TABLE IF NOT EXISTS public.dismissed_cluster_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cluster_id uuid NOT NULL REFERENCES public.crop_clusters(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (farmer_id, cluster_id)
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS dismissed_invites_farmer_idx ON public.dismissed_cluster_invites(farmer_id);
CREATE INDEX IF NOT EXISTS dismissed_invites_cluster_idx ON public.dismissed_cluster_invites(cluster_id);

-- Enable RLS
ALTER TABLE public.dismissed_cluster_invites ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT ON public.dismissed_cluster_invites TO authenticated;

-- RLS Policies: farmers manage only their own dismissals
DROP POLICY IF EXISTS "dismissed_select_own" ON public.dismissed_cluster_invites;
CREATE POLICY "dismissed_select_own" ON public.dismissed_cluster_invites FOR SELECT
  TO authenticated USING (auth.uid() = farmer_id);

DROP POLICY IF EXISTS "dismissed_insert_own" ON public.dismissed_cluster_invites;
CREATE POLICY "dismissed_insert_own" ON public.dismissed_cluster_invites FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = farmer_id);

-- join_cluster RPC: adds a farmer's crop listing as a cluster member
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
