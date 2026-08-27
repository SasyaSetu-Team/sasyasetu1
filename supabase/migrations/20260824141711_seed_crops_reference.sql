/*
# Seed crops reference table

1. Purpose
- The `crops` table is a read-only reference table (INSERT/UPDATE/DELETE denied via RLS for authenticated users).
- We seed three crops that match the existing UI sample data: Tomato, Onion, Paddy.
- These are used as foreign keys by `crop_listings.crop_id`.

2. Data inserted
- Tomato (Arka Rakshak variety)
- Onion (Nasik Red variety)
- Paddy (Sona Masuri variety)

3. Security
- No RLS policy changes. The existing `crops_select` (USING true) policy allows all authenticated users to read.
- This migration runs as the service role (bypasses RLS), which is the only way to insert into the locked `crops` table.

4. Idempotency
- Uses a NOT EXISTS guard so re-running is safe.
*/

INSERT INTO public.crops (name, variety, unit, description)
SELECT 'Tomato', 'Arka Rakshak', 'kg', 'Red hybrid tomato suitable for open-field cultivation'
WHERE NOT EXISTS (SELECT 1 FROM public.crops WHERE lower(name) = 'tomato' AND lower(variety) = 'arka rakshak');

INSERT INTO public.crops (name, variety, unit, description)
SELECT 'Onion', 'Nasik Red', 'kg', 'Red onion variety from Nasik region'
WHERE NOT EXISTS (SELECT 1 FROM public.crops WHERE lower(name) = 'onion' AND lower(variety) = 'nasik red');

INSERT INTO public.crops (name, variety, unit, description)
SELECT 'Paddy', 'Sona Masuri', 'kg', 'Premium medium-grain rice variety'
WHERE NOT EXISTS (SELECT 1 FROM public.crops WHERE lower(name) = 'paddy' AND lower(variety) = 'sona masuri');