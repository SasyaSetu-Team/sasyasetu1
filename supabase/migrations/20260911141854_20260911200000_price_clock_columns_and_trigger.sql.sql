/*
# Descending Price Clock for Harvested Crop Listings

## Summary
Adds a "descending price clock" to crop_listings so that when a crop is
marked Harvested, its price starts dropping over time toward a floor
price. This is data-model and calculation only — no UI changes.

## New Columns on crop_listings
1. price_start_per_kg (numeric, nullable) — the starting price when the
   clock begins, copied from indicative_price_per_kg. Never inflated
   above it.
2. price_floor_per_kg (numeric, nullable) — minimum price, ~70% of
   price_start_per_kg.
3. decay_speed (text, nullable) — 'fast' | 'medium' | 'slow' based on
   crop type.
4. price_drop_started_at (timestamptz, nullable) — when the price clock
   began (set when status changes to Harvested).
5. step_interval_minutes (int, nullable) — minutes between price drops:
   fast=20, medium=30, slow=45.
6. step_drop_amount (numeric, nullable) — price drop per step, computed
   so price reaches floor over ~8 steps.

## Trigger
- crop_listings_price_clock_trigger: BEFORE UPDATE trigger that fires
  when status transitions from non-Harvested to Harvested. Sets
  price_start_per_kg, price_floor_per_kg, decay_speed,
  price_drop_started_at, step_interval_minutes, and step_drop_amount.
  If indicative_price_per_kg is NULL, defaults to a reasonable price
  based on crop type.

## Helper Function
- get_decay_speed(crop_name text) — returns 'fast' for tomato/leafy
  greens, 'slow' for onion/potato/grains, 'medium' for everything else.

## Price Calculation (done in application code, not DB)
  current_price = price_start_per_kg - (step_drop_amount × completed_steps)
  floored at price_floor_per_kg, where completed_steps = floor(elapsed
  minutes / step_interval_minutes).

## Security
- No RLS policy changes. Existing crop_listings policies already allow
  owners to update their own rows. The trigger runs as SECURITY DEFINER
  so it can read crop names from the crops table.
*/

-- 1. Add columns
ALTER TABLE public.crop_listings
  ADD COLUMN IF NOT EXISTS price_start_per_kg numeric(10,2),
  ADD COLUMN IF NOT EXISTS price_floor_per_kg numeric(10,2),
  ADD COLUMN IF NOT EXISTS decay_speed text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_drop_started_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS step_interval_minutes int DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS step_drop_amount numeric(10,2) DEFAULT NULL;

-- 2. Helper function: determine decay speed from crop name
CREATE OR REPLACE FUNCTION public.get_decay_speed(p_crop_name text)
RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN lower(p_crop_name) IN ('tomato', 'spinach', 'palak', 'coriander', 'mint', 'curry leaves', 'leafy greens', 'lettuce', 'cabbage') THEN 'fast'
    WHEN lower(p_crop_name) IN ('onion', 'potato', 'paddy', 'rice', 'wheat', 'maize', 'groundnut', 'turmeric', 'cotton') THEN 'slow'
    ELSE 'medium'
  END;
$$;

-- 3. Trigger function: populate price clock fields on transition to Harvested
CREATE OR REPLACE FUNCTION public.populate_price_clock()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_crop_name text;
  v_speed text;
  v_interval int;
  v_start numeric(10,2);
  v_floor numeric(10,2);
  v_steps int := 8;
  v_drop numeric(10,2);
BEGIN
  -- Only fire when transitioning to Harvested
  IF NEW.status = 'Harvested' AND (OLD.status IS NULL OR OLD.status <> 'Harvested') THEN
    -- Determine crop name
    IF NEW.custom_crop_name IS NOT NULL THEN
      v_crop_name := NEW.custom_crop_name;
    ELSE
      SELECT c.name INTO v_crop_name FROM public.crops c WHERE c.id = NEW.crop_id;
    END IF;

    -- Determine decay speed
    v_speed := public.get_decay_speed(v_crop_name);

    -- Step interval
    v_interval := CASE v_speed
      WHEN 'fast' THEN 20
      WHEN 'slow' THEN 45
      ELSE 30
    END;

    -- Starting price: use indicative_price_per_kg, or a default
    v_start := COALESCE(NEW.indicative_price_per_kg, 25.00);

    -- Floor: ~70% of start
    v_floor := round((v_start * 0.70)::numeric, 2);

    -- Step drop: (start - floor) / steps, rounded to 2 decimals
    v_drop := round(((v_start - v_floor) / v_steps)::numeric, 2);

    -- Set fields
    NEW.price_start_per_kg := v_start;
    NEW.price_floor_per_kg := v_floor;
    NEW.decay_speed := v_speed;
    NEW.price_drop_started_at := now();
    NEW.step_interval_minutes := v_interval;
    NEW.step_drop_amount := v_drop;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Create the trigger
DROP TRIGGER IF EXISTS crop_listings_price_clock_trigger ON public.crop_listings;
CREATE TRIGGER crop_listings_price_clock_trigger
  BEFORE UPDATE ON public.crop_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_price_clock();

-- 5. Backfill: populate price clock for existing Harvested listings
-- that don't have price_start_per_kg set yet
DO $$
DECLARE
  v_listing record;
  v_crop_name text;
  v_speed text;
  v_interval int;
  v_start numeric(10,2);
  v_floor numeric(10,2);
  v_steps int := 8;
  v_drop numeric(10,2);
  v_harvest_date timestamptz;
BEGIN
  FOR v_listing IN
    SELECT id, crop_id, custom_crop_name, indicative_price_per_kg, harvested_at, created_at
    FROM public.crop_listings
    WHERE status = 'Harvested' AND price_start_per_kg IS NULL
  LOOP
    -- Determine crop name
    IF v_listing.custom_crop_name IS NOT NULL THEN
      v_crop_name := v_listing.custom_crop_name;
    ELSE
      SELECT c.name INTO v_crop_name FROM public.crops c WHERE c.id = v_listing.crop_id;
    END IF;

    v_speed := public.get_decay_speed(v_crop_name);
    v_interval := CASE v_speed WHEN 'fast' THEN 20 WHEN 'slow' THEN 45 ELSE 30 END;
    v_start := COALESCE(v_listing.indicative_price_per_kg, 25.00);
    v_floor := round((v_start * 0.70)::numeric, 2);
    v_drop := round(((v_start - v_floor) / v_steps)::numeric, 2);

    -- Use harvested_at as the clock start, or created_at if null
    v_harvest_date := COALESCE(v_listing.harvested_at, v_listing.created_at);

    UPDATE public.crop_listings
    SET
      price_start_per_kg = v_start,
      price_floor_per_kg = v_floor,
      decay_speed = v_speed,
      price_drop_started_at = v_harvest_date,
      step_interval_minutes = v_interval,
      step_drop_amount = v_drop
    WHERE id = v_listing.id;
  END LOOP;
END $$;
