/*
# Crop Clustering — Data Model + Background Matching Logic

## Summary
Adds automatic crop clustering: when a farmer saves a new Upcoming or Harvested crop,
the system checks for existing clusters with the same crop name, similar location, and
overlapping harvest window. If found, the crop joins the cluster. If 2+ similar unclustered
crops exist nearby, a new cluster is created linking them all. This is background-only —
no UI changes, no change to the existing crop creation flow.

## New Tables
1. crop_clusters
   - id (uuid PK)
   - crop_name (text, not null) — the crop name this cluster groups
   - variety (text, nullable) — variety from the crops table
   - location_area (text, nullable) — geographic area label
   - harvest_window_start (date) — earliest harvest date among members
   - harvest_window_end (date) — latest harvest date among members
   - overall_quality_grade (text, nullable) — aggregate quality (defaults to 'A')
   - total_quantity (numeric, default 0) — sum of all member quantities in kg
   - status (text: forming/ready/sold/closed, default 'forming')
   - closes_at (timestamptz, nullable) — when the cluster stops accepting members
   - transport_status (text, nullable) — for future transport coordination
   - created_at (timestamptz)

2. crop_cluster_members
   - id (uuid PK)
   - cluster_id (uuid FK → crop_clusters ON DELETE CASCADE)
   - crop_id (uuid FK → crop_listings ON DELETE CASCADE)
   - farmer_id (uuid FK → auth.users ON DELETE CASCADE)
   - quantity_contributed (numeric) — kg this farmer contributes
   - quality_grade (text, nullable) — individual farmer's grade
   - payout_share_percent (numeric, default 0) — share of payout (0-100)
   - created_at (timestamptz)
   - UNIQUE (cluster_id, crop_id) — a crop listing can only join one cluster

## Modified Tables
- crop_listings: added nullable location_area text column (no default, no UI change)

## Security
- RLS enabled on both new tables.
- SELECT for authenticated (all signed-in users can see clusters and members).
- INSERT/UPDATE/DELETE denied for authenticated — only the SECURITY DEFINER trigger
  function manages cluster rows, so users cannot tamper with clusters directly.

## Background Matching Logic
- AFTER INSERT trigger on crop_listings fires auto_cluster_crop().
- Function is SECURITY DEFINER, wrapped in exception handler so crop creation never fails.
- Matching criteria:
  1. Same crop name (case-insensitive) — via custom_crop_name or crops.name join
  2. Same location_area (case-insensitive, null = null)
  3. Harvest dates within 7 days of each other
- If a matching existing cluster (status forming/ready) is found:
  - Add the new crop as a member
  - Recalculate cluster totals (total_quantity, harvest window)
  - Update payout shares proportionally
- If no matching cluster but 2+ unclustered similar crops exist nearby:
  - Create a new cluster
  - Add all matching unclustered crops + the new crop as members
  - Set totals, harvest window, payout shares
- Cluster auto-promotes to 'ready' when total_quantity >= 100 kg
- closes_at defaults to harvest_window_end + 7 days
*/

-- Add location_area to crop_listings (nullable, no UI change)
ALTER TABLE public.crop_listings ADD COLUMN IF NOT EXISTS location_area text;

-- Create crop_clusters table
CREATE TABLE IF NOT EXISTS public.crop_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_name text NOT NULL,
  variety text,
  location_area text,
  harvest_window_start date,
  harvest_window_end date,
  overall_quality_grade text DEFAULT 'A',
  total_quantity numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'forming' CHECK (status IN ('forming','ready','sold','closed')),
  closes_at timestamptz,
  transport_status text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create crop_cluster_members join table
CREATE TABLE IF NOT EXISTS public.crop_cluster_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id uuid NOT NULL REFERENCES public.crop_clusters(id) ON DELETE CASCADE,
  crop_id uuid NOT NULL REFERENCES public.crop_listings(id) ON DELETE CASCADE,
  farmer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quantity_contributed numeric(12,2) NOT NULL CHECK (quantity_contributed >= 0),
  quality_grade text,
  payout_share_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK (payout_share_percent >= 0 AND payout_share_percent <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cluster_id, crop_id)
);

-- Indexes for matching queries
CREATE INDEX IF NOT EXISTS cluster_members_crop_idx ON public.crop_cluster_members(crop_id);
CREATE INDEX IF NOT EXISTS cluster_members_cluster_idx ON public.crop_cluster_members(cluster_id);
CREATE INDEX IF NOT EXISTS clusters_name_location_idx ON public.crop_clusters(crop_name, location_area, status);

-- Enable RLS
ALTER TABLE public.crop_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_cluster_members ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT ON public.crop_clusters TO authenticated;
GRANT SELECT ON public.crop_cluster_members TO authenticated;

-- RLS Policies: SELECT for authenticated, deny DML (trigger manages rows)
DROP POLICY IF EXISTS "clusters_select" ON public.crop_clusters;
CREATE POLICY "clusters_select" ON public.crop_clusters FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "clusters_insert_denied" ON public.crop_clusters;
CREATE POLICY "clusters_insert_denied" ON public.crop_clusters FOR INSERT
  TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "clusters_update_denied" ON public.crop_clusters;
CREATE POLICY "clusters_update_denied" ON public.crop_clusters FOR UPDATE
  TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "clusters_delete_denied" ON public.crop_clusters;
CREATE POLICY "clusters_delete_denied" ON public.crop_clusters FOR DELETE
  TO authenticated USING (false);

DROP POLICY IF EXISTS "members_select" ON public.crop_cluster_members;
CREATE POLICY "members_select" ON public.crop_cluster_members FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "members_insert_denied" ON public.crop_cluster_members;
CREATE POLICY "members_insert_denied" ON public.crop_cluster_members FOR INSERT
  TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "members_update_denied" ON public.crop_cluster_members;
CREATE POLICY "members_update_denied" ON public.crop_cluster_members FOR UPDATE
  TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "members_delete_denied" ON public.crop_cluster_members;
CREATE POLICY "members_delete_denied" ON public.crop_cluster_members FOR DELETE
  TO authenticated USING (false);

-- Auto-clustering trigger function
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
BEGIN
  BEGIN
    -- Only cluster Upcoming or Harvested crops
    IF NEW.status NOT IN ('Upcoming', 'Harvested') THEN
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
    SELECT count(*) INTO v_unclustered
    FROM public.crop_listings cl
    LEFT JOIN public.crop_cluster_members m ON m.crop_id = cl.id
    WHERE m.id IS NULL
      AND cl.id <> NEW.id
      AND cl.status IN ('Upcoming', 'Harvested')
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
          AND cl.status IN ('Upcoming', 'Harvested')
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

      -- Add all matching unclustered crops as members
      FOR v_member IN
        SELECT cl.id, cl.owner_id, cl.quantity_kg
        FROM public.crop_listings cl
        LEFT JOIN public.crop_cluster_members m ON m.crop_id = cl.id
        WHERE m.id IS NULL
          AND cl.id <> NEW.id
          AND cl.status IN ('Upcoming', 'Harvested')
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

-- Create the AFTER INSERT trigger
DROP TRIGGER IF EXISTS crop_listings_after_insert_cluster ON public.crop_listings;
CREATE TRIGGER crop_listings_after_insert_cluster
  AFTER INSERT ON public.crop_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_cluster_crop();