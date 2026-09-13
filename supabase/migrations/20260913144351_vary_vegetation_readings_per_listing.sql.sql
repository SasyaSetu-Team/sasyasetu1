-- Vary vegetation readings per verified listing so detail views differ
-- All remain positive/passing — just different descriptive text per crop type

-- Onion (Upcoming standalone)
UPDATE public.crop_listings SET listing_vegetation_reading = 'Healthy crop canopy observed'
WHERE id = '03855c51-cf6e-490c-8c6d-ea44f212147a';

-- Groundnut (cluster-linked, Sold — Ramesh)
UPDATE public.crop_listings SET listing_vegetation_reading = 'Active vegetation confirmed'
WHERE id = 'b5c04d5c-e549-4ddb-8c05-f5d51b7a9b9e';

-- Groundnut (cluster-linked, Anjali)
UPDATE public.crop_listings SET listing_vegetation_reading = 'Dense ground cover detected'
WHERE id = '6b9249c0-cc0f-47a3-ae1b-b43c4fa588b3';

-- Groundnut (standalone Sold)
UPDATE public.crop_listings SET listing_vegetation_reading = 'Uniform green cover confirmed'
WHERE id = '5a614369-e2d3-4aac-a47f-aaa3c6a2a35b';

-- Tomato (cluster-linked, Upcoming)
UPDATE public.crop_listings SET listing_vegetation_reading = 'Flowering stage detected'
WHERE id = '7d033817-00c0-4d73-bce8-62554ed5a309';

-- Banana listings (Upcoming standalone) — 5 listings
UPDATE public.crop_listings SET listing_vegetation_reading = 'Broadleaf canopy confirmed'
WHERE id = 'dc4f30f4-bb91-4e5e-b6e7-e45341f03911';

UPDATE public.crop_listings SET listing_vegetation_reading = 'Healthy plantation growth observed'
WHERE id = '47cd850f-d9a9-4898-8705-9417963ef6b6';

UPDATE public.crop_listings SET listing_vegetation_reading = 'Active canopy growth confirmed'
WHERE id = '9fd04779-c858-4ff6-be4c-3af4e0d433b5';

UPDATE public.crop_listings SET listing_vegetation_reading = 'Vigorous leaf cover detected'
WHERE id = '36e4ae0b-9053-4e7c-908d-3371ba7fd4a7';

UPDATE public.crop_listings SET listing_vegetation_reading = 'Dense plantation canopy observed'
WHERE id = '5f051503-d2ff-4ce8-95c8-8740dde4cb8a';

-- Brinjal (Upcoming standalone)
UPDATE public.crop_listings SET listing_vegetation_reading = 'Bushy growth confirmed'
WHERE id = '46608087-48ab-465a-921a-0e4880bf7190';

-- Groundnut (Upcoming standalone)
UPDATE public.crop_listings SET listing_vegetation_reading = 'Even ground cover detected'
WHERE id = '349fe2ac-fca6-4329-8b3b-317ba8a5621c';

-- Turmeric (Upcoming standalone) — 2 listings
UPDATE public.crop_listings SET listing_vegetation_reading = 'Lush foliar growth confirmed'
WHERE id = '47aab55c-ed35-471b-bce4-d63dd640e1d8';

UPDATE public.crop_listings SET listing_vegetation_reading = 'Healthy rhizome canopy observed'
WHERE id = 'c11febc5-29f0-4e12-ab8b-15447ea0e0c5';