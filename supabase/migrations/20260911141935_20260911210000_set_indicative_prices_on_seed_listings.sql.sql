/*
# Set Indicative Prices on Seed Listings

## Summary
Many demo crop listings were created without indicative_price_per_kg.
The price clock backfill defaulted these to ₹25/kg. This migration sets
realistic per-crop prices on those listings and recomputes the price
clock fields (start, floor, step_drop) to match.

## Changes
1. Update indicative_price_per_kg for Harvested listings that currently
   have NULL or default pricing, based on crop type.
2. Recompute price_start_per_kg, price_floor_per_kg, step_drop_amount
   for these listings to match the new indicative_price_per_kg.
*/

DO $$
DECLARE
  v_listing record;
  v_crop_name text;
  v_price numeric(10,2);
  v_floor numeric(10,2);
  v_drop numeric(10,2);
  v_steps int := 8;
BEGIN
  FOR v_listing IN
    SELECT cl.id, cl.crop_id, cl.custom_crop_name, cl.indicative_price_per_kg
    FROM public.crop_listings cl
    WHERE cl.status = 'Harvested'
      AND cl.indicative_price_per_kg IS NULL
  LOOP
    -- Determine crop name
    IF v_listing.custom_crop_name IS NOT NULL THEN
      v_crop_name := v_listing.custom_crop_name;
    ELSE
      SELECT c.name INTO v_crop_name FROM public.crops c WHERE c.id = v_listing.crop_id;
    END IF;

    -- Set realistic price per crop
    v_price := CASE lower(v_crop_name)
      WHEN 'tomato' THEN 18.00
      WHEN 'onion' THEN 22.00
      WHEN 'chilli' THEN 45.00
      WHEN 'groundnut' THEN 38.00
      WHEN 'paddy' THEN 20.00
      WHEN 'potato' THEN 15.00
      WHEN 'banana' THEN 30.00
      ELSE 25.00
    END;

    v_floor := round((v_price * 0.70)::numeric, 2);
    v_drop := round(((v_price - v_floor) / v_steps)::numeric, 2);

    UPDATE public.crop_listings
    SET
      indicative_price_per_kg = v_price,
      price_start_per_kg = v_price,
      price_floor_per_kg = v_floor,
      step_drop_amount = v_drop
    WHERE id = v_listing.id;
  END LOOP;
END $$;
