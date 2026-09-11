/*
# Fix: widen Anantapur Test cluster harvest window so Ramesh's Oct 18-22
# Tomato listings match and produce invite cards.
#
# The cluster's harvest_window_end was 2026-09-30, which with the ±7 day
# tolerance in fetchClusterInvites() only covers up to 2026-10-07.
# Ramesh's unclustered Tomato listings have harvest dates of Oct 18/20/22.
# Extending harvest_window_end to 2026-10-31 covers all of them.
*/

UPDATE crop_clusters
SET harvest_window_end = '2026-10-31'
WHERE crop_name = 'Tomato' AND location_area = 'Anantapur Test';
