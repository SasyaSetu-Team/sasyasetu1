/*
# Fix Descending Price Clock: Backfill + Trigger Fix

## Problem
1. The price-clock trigger only fires on transition to 'Harvested',
   but seed data set status to 'Sold' directly — bypassing the trigger
   entirely. Result: price_drop_started_at is NULL for all listings,
   so the price clock never starts ticking.
2. Sold listings that DO have price_start_per_kg, price_floor_per_kg,
   and decay_speed set are missing price_drop_started_at, so
   computeCurrentPrice() returns the static start price with no decay.

## Fix
1. Backfill price_drop_started_at = now() for all listings that have
   price_start_per_kg set but price_drop_started_at NULL, so the clock
   starts running immediately for demo purposes.
2. Backfill step_interval_minutes and step_drop_amount for any listings
   that have price_start/floor but missing step fields.
3. Widen the trigger to also fire on transition to 'Sold' (not just
   'Harvested'), since the buy_now RPC sets status to 'Sold' and the
   price clock should start at that point.

## Columns affected (all existing, no new columns)
- price_start_per_kg
- price_floor_per_kg
- decay_speed
- price_drop_started_at
- step_interval_minutes
- step_drop_amount

## Security
- No RLS changes. Trigger is SECURITY DEFINER (unchanged).
*/

-- 1. Backfill price_drop_started_at and step fields for listings
--    that have price_start_per_kg but are missing the clock-start
--    timestamp or step parameters.
UPDATE public.crop_listings
SET
  price_drop_started_at = COALESCE(price_drop_started_at, now()),
  step_interval_minutes = COALESCE(step_interval_minutes,
    CASE decay_speed
      WHEN 'fast' THEN 20
      WHEN 'slow' THEN 45
      ELSE 30
    END),
  step_drop_amount = COALESCE(step_drop_amount,
    round(((price_start_per_kg - price_floor_per_kg) / 8)::numeric, 2))
WHERE price_start_per_kg IS NOT NULL
  AND price_floor_per_kg IS NOT NULL;

-- 2. Widen the trigger function to also fire on transition to 'Sold'
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
  -- Fire when transitioning to Harvested OR Sold
  IF (NEW.status = 'Harvested' OR NEW.status = 'Sold')
     AND (OLD.status IS NULL OR (OLD.status <> 'Harvested' AND OLD.status <> 'Sold')) THEN
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