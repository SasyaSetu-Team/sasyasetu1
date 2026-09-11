/*
# Add extra Tomato cluster in Anantapur Test for invite buffer

Creates a second Tomato cluster in "Anantapur Test" location so Ramesh
(who has 4 unclustered Tomato listings in that area) gets at least 2
cluster invites. Accepting one still leaves one behind.

Also adds a Chilli cluster in Kurnool as another invite option
(reuses existing Chilli cluster — just ensures the buffer is enough).
*/

INSERT INTO crop_clusters (crop_name, variety, location_area, harvest_window_start, harvest_window_end, overall_quality_grade, total_quantity, status, closes_at, price_start_per_kg, price_floor_per_kg, price_drop_started_at, step_interval_minutes, step_drop_amount, decay_speed)
SELECT 'Tomato', 'Hybrid', 'Anantapur Test', '2026-09-20', '2026-09-30', 'A', 100, 'forming', now() + interval '7 days', 30, 21, now(), 30, 1.13, 'fast'
WHERE NOT EXISTS (
  SELECT 1 FROM crop_clusters WHERE crop_name = 'Tomato' AND location_area = 'Anantapur Test'
);
