-- Spread listing_verified_at across verified Upcoming listings (1-7 days ago)
-- so "Satellite pass" shows different values instead of all "0 days ago"

-- Onion Upcoming — 7 days ago
UPDATE public.crop_listings SET listing_verified_at = now() - interval '7 days'
WHERE id = '03855c51-cf6e-490c-8c6d-ea44f212147a';

-- Tomato (cluster-linked) Upcoming — 3 days ago
UPDATE public.crop_listings SET listing_verified_at = now() - interval '3 days'
WHERE id = '7d033817-00c0-4d73-bce8-62554ed5a309';

-- Banana Upcoming — 5 listings, spread 1-5 days ago
UPDATE public.crop_listings SET listing_verified_at = now() - interval '5 days'
WHERE id = 'dc4f30f4-bb91-4e5e-b6e7-e45341f03911';

UPDATE public.crop_listings SET listing_verified_at = now() - interval '4 days'
WHERE id = '47cd850f-d9a9-4898-8705-9417963ef6b6';

UPDATE public.crop_listings SET listing_verified_at = now() - interval '2 days'
WHERE id = '9fd04779-c858-4ff6-be4c-3af4e0d433b5';

UPDATE public.crop_listings SET listing_verified_at = now() - interval '6 days'
WHERE id = '36e4ae0b-9053-4e7c-908d-3371ba7fd4a7';

UPDATE public.crop_listings SET listing_verified_at = now() - interval '1 day'
WHERE id = '5f051503-d2ff-4ce8-95c8-8740dde4cb8a';

-- Brinjal Upcoming — 4 days ago
UPDATE public.crop_listings SET listing_verified_at = now() - interval '4 days'
WHERE id = '46608087-48ab-465a-921a-0e4880bf7190';

-- Groundnut Upcoming — 2 days ago
UPDATE public.crop_listings SET listing_verified_at = now() - interval '2 days'
WHERE id = '349fe2ac-fca6-4329-8b3b-317ba8a5621c';

-- Turmeric Upcoming — 2 listings, 5 and 6 days ago
UPDATE public.crop_listings SET listing_verified_at = now() - interval '5 days'
WHERE id = '47aab55c-ed35-471b-bce4-d63dd640e1d8';

UPDATE public.crop_listings SET listing_verified_at = now() - interval '6 days'
WHERE id = 'c11febc5-29f0-4e12-ab8b-15447ea0e0c5';

-- Also spread the verified Sold/cluster-linked listings for consistency
-- Groundnut (cluster, Sold, both harvest verified) — 7 days ago
UPDATE public.crop_listings SET listing_verified_at = now() - interval '7 days'
WHERE id = 'b5c04d5c-e549-4ddb-8c05-f5d51b7a9b9e';

-- Groundnut (cluster, Anjali, Sold) — 3 days ago
UPDATE public.crop_listings SET listing_verified_at = now() - interval '3 days'
WHERE id = '6b9249c0-cc0f-47a3-ae1b-b43c4fa588b3';

-- Groundnut (standalone Sold) — 4 days ago
UPDATE public.crop_listings SET listing_verified_at = now() - interval '4 days'
WHERE id = '5a614369-e2d3-4aac-a47f-aaa3c6a2a35b';