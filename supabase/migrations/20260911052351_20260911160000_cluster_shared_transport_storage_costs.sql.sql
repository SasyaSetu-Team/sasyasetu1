/*
# Cluster Shared Transport & Storage Costs

## Summary
Adds transport_cost and storage_cost columns to crop_clusters so clusters
can track the total shared cost of transport and cold storage. These are
mock/prototype values for demo purposes — no real payment processing.
Each farmer's individual share is calculated proportionally to their
quantity_contributed (same pattern as payout_share_percent).

## Changes
1. crop_clusters: added two nullable numeric columns:
   - transport_cost numeric(10,2) — total shared transport cost in ₹ (NULL = not used)
   - storage_cost numeric(10,2) — total shared cold storage cost in ₹ (NULL = not used)
2. Seeds realistic mock costs on existing demo clusters:
   - Tomato (forming): transport ₹800, storage NULL
   - Onion (forming): transport ₹600, storage ₹400
   - Chilli (forming): transport ₹900, storage ₹500
   - Groundnut (ready/in-transit): transport ₹1,200, storage ₹800
   - Paddy (sold): transport ₹1,500, storage ₹600
3. No RLS or policy changes — existing SELECT policies already expose all
   cluster columns to authenticated users.

## Notes
- A NULL cost means that service is not being used for that cluster.
- The frontend calculates each farmer's share as:
  (quantity_contributed / total_quantity) * cost
- For invite previews, the farmer's share is calculated using the
  combined total (existing members + invitee), same as payout preview.
*/

-- Add cost columns
ALTER TABLE public.crop_clusters
  ADD COLUMN IF NOT EXISTS transport_cost numeric(10,2),
  ADD COLUMN IF NOT EXISTS storage_cost numeric(10,2);

-- Seed mock costs on existing demo clusters (matched by crop_name + location_area + status)
UPDATE public.crop_clusters
SET transport_cost = 800, storage_cost = NULL
WHERE crop_name = 'Tomato' AND location_area = 'Kurnool' AND status = 'forming';

UPDATE public.crop_clusters
SET transport_cost = 600, storage_cost = 400
WHERE crop_name = 'Onion' AND location_area = 'Kurnool' AND status = 'forming';

UPDATE public.crop_clusters
SET transport_cost = 900, storage_cost = 500
WHERE crop_name = 'Chilli' AND location_area = 'Kurnool' AND status = 'forming';

UPDATE public.crop_clusters
SET transport_cost = 1200, storage_cost = 800
WHERE crop_name = 'Groundnut' AND location_area = 'Kadapa' AND status = 'ready';

UPDATE public.crop_clusters
SET transport_cost = 1500, storage_cost = 600
WHERE crop_name = 'Paddy' AND location_area = 'Warangal' AND status = 'sold';
