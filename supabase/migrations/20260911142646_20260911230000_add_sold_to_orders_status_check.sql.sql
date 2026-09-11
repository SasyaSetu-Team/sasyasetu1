/*
# Add 'Sold' to orders status check constraint

## Summary
The buy_now RPC creates orders with status 'Sold' to represent instant
full-batch purchases. The existing orders_status_check constraint doesn't
include 'Sold'. This migration adds it.
*/

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status = ANY (ARRAY['Booked', 'Farmer Confirmed', 'Assured Deal', 'Ready', 'In Transit', 'Delivered', 'Sold', 'Cancelled', 'Disputed']));
