/*
# Add payment tracking columns to orders table

1. Modified Tables
- `orders`
  - `payment_type` (text, nullable) — records the type of payment: 'token' or 'full'.
  - `amount_paid` (numeric, nullable) — the amount paid by the buyer so far.
  - `token_percent` (numeric, default 10) — the percentage of the total price required as a token payment, defaults to 10%.

2. Notes
- No existing columns are altered or removed.
- No other tables are touched.
- All three columns are nullable (except token_percent which has a default) so existing rows remain valid.
*/

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_type text,
  ADD COLUMN IF NOT EXISTS amount_paid numeric,
  ADD COLUMN IF NOT EXISTS token_percent numeric DEFAULT 10;
