/*
# Buy Now RPC for Descending Price Clock

## Summary
Adds a `buy_now(p_listing_id uuid)` SECURITY DEFINER function that:
1. Recomputes the current price SERVER-SIDE from price clock fields (never
   trusts a client-supplied price).
2. Creates an order at that exact locked price for the full available
   quantity (instant full-batch sale, no partial quantity, no negotiation).
3. Creates a deal marked 'Paid' (mock sale — token = total, balance = 0).
4. Stops the price clock by clearing price_drop_started_at.
5. Marks the listing as 'Sold' and sets available_quantity_kg to 0.

## Security
- SECURITY DEFINER, SET search_path = public — bypasses RLS to update
  the listing (which the buyer doesn't own) and to insert into deals
  (which has deny-all RLS for authenticated).
- Buyer identity derived from auth.uid(), not a parameter.
- Price recomputed entirely from server-side timestamp and listing data.
- Listing must be Harvested, visible, and still have available quantity.
- No client-supplied price, quantity, or buyer_id accepted.
- EXECUTE revoked from anon, granted to authenticated.
*/

CREATE OR REPLACE FUNCTION public.buy_now(p_listing_id uuid)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing public.crop_listings;
  v_current_price numeric(10,2);
  v_elapsed_minutes numeric;
  v_completed_steps int;
  v_computed numeric(10,2);
  v_order public.orders;
  v_deal public.deals;
  v_total numeric(12,2);
BEGIN
  -- 1. Lock the listing row to prevent concurrent purchases
  SELECT * INTO v_listing
  FROM public.crop_listings
  WHERE id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  -- 2. Validate listing is eligible for Buy Now
  IF v_listing.status <> 'Harvested' THEN
    RAISE EXCEPTION 'Listing is not available for instant purchase';
  END IF;

  IF v_listing.status = 'Sold' THEN
    RAISE EXCEPTION 'This crop has already been sold';
  END IF;

  IF v_listing.is_visible = false THEN
    RAISE EXCEPTION 'This listing is not available';
  END IF;

  IF v_listing.available_quantity_kg <= 0 THEN
    RAISE EXCEPTION 'No quantity available for purchase';
  END IF;

  -- 3. Recompute current price server-side from price clock fields
  IF v_listing.price_start_per_kg IS NULL
     OR v_listing.price_floor_per_kg IS NULL
     OR v_listing.price_drop_started_at IS NULL
     OR v_listing.step_interval_minutes IS NULL
     OR v_listing.step_drop_amount IS NULL THEN
    -- No price clock — fall back to indicative price
    v_current_price := COALESCE(v_listing.indicative_price_per_kg, 0);
    IF v_current_price <= 0 THEN
      RAISE EXCEPTION 'No price available for this listing';
    END IF;
  ELSE
    -- Compute elapsed minutes from clock start to now
    v_elapsed_minutes := EXTRACT(EPOCH FROM (now() - v_listing.price_drop_started_at)) / 60.0;

    IF v_elapsed_minutes < 0 THEN
      -- Clock hasn't started yet (future-dated harvest) — use start price
      v_current_price := v_listing.price_start_per_kg;
    ELSE
      v_completed_steps := floor(v_elapsed_minutes / v_listing.step_interval_minutes);
      v_computed := v_listing.price_start_per_kg
        - (v_completed_steps * v_listing.step_drop_amount);
      -- Floor at price_floor_per_kg
      v_current_price := GREATEST(v_computed, v_listing.price_floor_per_kg);
    END IF;
  END IF;

  -- 4. Create the order at the locked server-computed price (full quantity)
  v_total := round(v_listing.available_quantity_kg * v_current_price, 2);

  INSERT INTO public.orders (buyer_id, listing_id, quantity_kg, unit_price, status)
  VALUES (auth.uid(), p_listing_id, v_listing.available_quantity_kg, v_current_price, 'Sold')
  RETURNING * INTO v_order;

  -- 5. Create a deal marked 'Paid' (mock instant full payment)
  INSERT INTO public.deals (order_id, token_amount, balance_amount, total_amount, status)
  VALUES (v_order.id, v_total, 0, v_total, 'Paid')
  RETURNING * INTO v_deal;

  -- 6. Stop the price clock and mark the listing as Sold
  UPDATE public.crop_listings
  SET
    status = 'Sold',
    available_quantity_kg = 0,
    price_drop_started_at = NULL,
    updated_at = now()
  WHERE id = p_listing_id;

  -- 7. Return the order so the client gets the locked price
  RETURN v_order;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.buy_now(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.buy_now(uuid) TO authenticated;
