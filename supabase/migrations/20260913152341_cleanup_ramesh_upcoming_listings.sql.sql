-- Ramesh Kumar Upcoming tab cleanup
-- Keep: Paddy (180kg, 5 Nov), Onion (200kg, 15 Oct), Groundnut (150kg, 22 Oct)
-- Preserve: Tomato 7d033817 (in crop_cluster_members — safeguard)
-- Delete all other Upcoming listings not in crop_cluster_members

-- First verify the Tomato listing is truly in crop_cluster_members before preserving
-- (already confirmed via query, but double-checking the safeguard)
-- Tomato 7d033817-00c0-4d73-bce8-62554ed5a309: in_cluster_member = true → PRESERVED

-- Delete non-cluster-member Upcoming listings for Ramesh
-- Banana x5
DELETE FROM public.crop_listings WHERE id IN (
  'dc4f30f4-bb91-4e5e-b6e7-e45341f03911',
  '5f051503-d2ff-4ce8-95c8-8740dde4cb8a',
  '36e4ae0b-9053-4e7c-908d-3371ba7fd4a7',
  '9fd04779-c858-4ff6-be4c-3af4e0d433b5',
  '47cd850f-d9a9-4898-8705-9417963ef6b6'
) AND owner_id = '177e32f1-10e9-41e6-a71f-e8a8d3bde1d4' AND status = 'Upcoming';

-- Brinjal
DELETE FROM public.crop_listings WHERE id = '46608087-48ab-465a-921a-0e4880bf7190'
  AND owner_id = '177e32f1-10e9-41e6-a71f-e8a8d3bde1d4' AND status = 'Upcoming';

-- Groundnut 100kg (not the 150kg target)
DELETE FROM public.crop_listings WHERE id = '349fe2ac-fca6-4329-8b3b-317ba8a5621c'
  AND owner_id = '177e32f1-10e9-41e6-a71f-e8a8d3bde1d4' AND status = 'Upcoming';

-- Onion 70kg (is_cluster_linked but NOT in crop_cluster_members — safe to delete)
DELETE FROM public.crop_listings WHERE id = 'f76d69c8-600c-41f5-a83a-26cc245057c1'
  AND owner_id = '177e32f1-10e9-41e6-a71f-e8a8d3bde1d4' AND status = 'Upcoming';

-- Paddy 75kg (is_cluster_linked but NOT in crop_cluster_members — safe to delete)
DELETE FROM public.crop_listings WHERE id = 'f1054946-019f-4f66-911e-f77ea8e7d065'
  AND owner_id = '177e32f1-10e9-41e6-a71f-e8a8d3bde1d4' AND status = 'Upcoming';

-- Turmeric x2
DELETE FROM public.crop_listings WHERE id IN (
  'c11febc5-29f0-4e12-ab8b-15447ea0e0c5',
  '47aab55c-ed35-471b-bce4-d63dd640e1d8'
) AND owner_id = '177e32f1-10e9-41e6-a71f-e8a8d3bde1d4' AND status = 'Upcoming';

-- Set listing_verified = true for Groundnut and Paddy (Onion already verified)
UPDATE public.crop_listings
SET listing_verified = true,
    listing_verified_at = now() - interval '3 days'
WHERE id = 'cb822ec1-a483-4490-af4e-d78c5ce4a715'
  AND owner_id = '177e32f1-10e9-41e6-a71f-e8a8d3bde1d4';

UPDATE public.crop_listings
SET listing_verified = true,
    listing_verified_at = now() - interval '5 days'
WHERE id = '74f6bd3d-e678-4c75-870e-7675c151b7da'
  AND owner_id = '177e32f1-10e9-41e6-a71f-e8a8d3bde1d4';