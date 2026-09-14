/*
# Book Listing RPC — Token and Full Payment

## Summary
Adds a `book_listing(p_listing_id uuid, p_payment_type text)` SECURITY DEFINER
function that handles both booking flows:

1. **Token payment (Upcoming listings)**: Creates an order with
   `payment_type='token'`, `amount_paid` = 10% of total, `token_percent=10`,
   status='Booked'. Hides the listing from other buyers by setting
   `is_visible=false`.

2. **Full payment (Harvested listings)**: Creates an order with
   `payment_type='full'`, `amount_paid` = full total, `token_percent=10`
   (default, unused for full), status='Booked'. Hides the listing from
   other buyers by setting `is_visible=false`.

Both flows:
- Recompute the price server-side (same logic as buy_now for Harvested;
  uses indicative_price_per_kg for Upcoming).
- Lock the listing row with FOR UPDATE to prevent concurrent bookings.
- Set `is_visible=false` so the listing disappears from all other buyers'
  Explore Crops view.
- Return the created order row so the client gets the locked price and
  computed amounts.

## Security
- SECURITY DEFINER, SET search_path = public — bypasses RLS to update
  the listing (which the buyer doesn't own) and to insert into orders.
- Buyer identity derived from auth.uid(), not a parameter.
- Price recomputed entirely from server-side data — no client-supplied price.
- Listing must be visible and have available quantity.
- EXECUTE revoked from anon, granted to authenticated.

## Notes
- The existing `buy_now` RPC remains untouched — it handles the
  descending price clock "Buy Now" flow for Harvested listings with
  instant Sold status. This new RPC handles the booking/pre-book flow
  with Booked status and payment tracking columns.
- `payment_type` accepts 'token' or 'full'; any other value raises an error.
- `amount_paid` for token = quantity × price × (token_percent / 100).
- `amount_paid` for full = quantity × price (the entire amount).
*/

CREATE OR REPLACE FUNCTION public.book_listing(
  p_listing_id uuid,
  p_payment_type text
)
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
  v_total numeric(12,2);
  v_token_percent numeric := 10;
  v_amount_paid numeric(12,2);
BEGIN
  -- 1. Lock the listing row to prevent concurrent bookings
  SELECT * INTO v_listing
  FROM public.crop_listings
  WHERE id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  -- 2. Validate listing is eligible
  IF v_listing.is_visible = false THEN
    RAISE EXCEPTION 'This listing is no longer available';
  END IF;

  IF v_listing.available_quantity_kg <= 0 THEN
    RAISE EXCEPTION 'No quantity available for booking';
  END IF;

  IF p_payment_type NOT IN ('token', 'full') THEN
    RAISE EXCEPTION 'Invalid payment type';
  END IF;

  -- 3. Validate listing status matches payment type
  IF p_payment_type = 'token' AND v_listing.status <> 'Upcoming' THEN
    RAISE EXCEPTION 'Token payment is only available for upcoming crops';
  END IF;

  IF p_payment_type = 'full' AND v_listing.status <> 'Harvested' THEN
    RAISE EXCEPTION 'Full payment is only available for harvested crops';
  END IF;

  -- 4. Compute current price server-side
  IF p_payment_type = 'full' AND v_listing.price_start_per_kg IS NOT NULL
     AND v_listing.price_floor_per_kg IS NOT NULL
     AND v_listing.price_drop_started_at IS NOT NULL
     AND v_listing.step_interval_minutes IS NOT NULL
     AND v_listing.step_drop_amount IS NOT NULL THEN
    -- Descending price clock for Harvested listings
    v_elapsed_minutes := EXTRACT(EPOCH FROM (now() - v_listing.price_drop_started_at)) / 60.0;
    IF v_elapsed_minutes < 0 THEN
      v_current_price := v_listing.price_start_per_kg;
    ELSE
      v_completed_steps := floor(v_elapsed_minutes / v_listing.step_interval_minutes);
      v_computed := v_listing.price_start_per_kg
        - (v_completed_steps * v_listing.step_drop_amount);
      v_current_price := GREATEST(v_computed, v_listing.price_floor_per_kg);
    END IF;
  ELSE
    -- No price clock or Upcoming — use indicative price
    v_current_price := COALESCE(v_listing.indicative_price_per_kg, 0);
    IF v_current_price <= 0 THEN
      RAISE EXCEPTION 'No price available for this listing';
    END IF;
  END IF;

  -- 5. Compute total and amount paid
  v_total := round(v_listing.available_quantity_kg * v_current_price, 2);

  IF p_payment_type = 'token' THEN
    v_amount_paid := round(v_total * (v_token_percent / 100.0), 2);
  ELSE
    v_amount_paid := v_total;
  END IF;

  -- 6. Create the order with payment tracking columns
  INSERT INTO public.orders (
    buyer_id, listing_id, quantity_kg, unit_price, status,
    payment_type, amount_paid, token_percent
  )
  VALUES (
    auth.uid(), p_listing_id, v_listing.available_quantity_kg,
    v_current_price, 'Booked', p_payment_type, v_amount_paid, v_token_percent
  )
  RETURNING * INTO v_order;

  -- 7. Hide the listing from other buyers (commit the booking)
  UPDATE public.crop_listings
  SET is_visible = false, updated_at = now()
  WHERE id = p_listing_id;

  -- 8. Return the order so the client gets the locked price and amounts
  RETURN v_order;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.book_listing(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.book_listing(uuid, text) TO authenticated;
