/*
# Add 'Sold' to crop_listings status check constraint

## Summary
The buy_now RPC marks crop listings as 'Sold' after instant purchase.
The existing crop_listings_status_check constraint only allows
'Upcoming' and 'Harvested'. This adds 'Sold'.
*/

ALTER TABLE public.crop_listings DROP CONSTRAINT IF EXISTS crop_listings_status_check;
ALTER TABLE public.crop_listings ADD CONSTRAINT crop_listings_status_check
  CHECK (status = ANY (ARRAY['Upcoming', 'Harvested', 'Sold']));
