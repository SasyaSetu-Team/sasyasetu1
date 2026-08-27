-- 1. Add unique constraint on crops.name to enable ON CONFLICT
ALTER TABLE public.crops ADD CONSTRAINT crops_name_unique UNIQUE (name);

-- 2. Seed missing reference crops idempotently
INSERT INTO public.crops (name, variety, unit, description)
VALUES
  ('Sweet Corn', 'Sugar Pearl', 'kg', 'Sweet hybrid corn variety'),
  ('Maize', 'Hybrid Pioneer 30V92', 'kg', 'High-yielding fodder maize variety'),
  ('Chilli', 'Byadagi', 'kg', 'Popular red chilli variety from Karnataka'),
  ('Potato', 'Kufri Jyoti', 'kg', 'Early-season potato variety'),
  ('Brinjal', 'Arka Navneet', 'kg', 'Purple oval brinjal variety'),
  ('Okra', 'Arka Anamika', 'kg', 'High-yielding okra variety'),
  ('Groundnut', 'TMV-2', 'kg', 'Bunch-type groundnut variety'),
  ('Cotton', 'Bt Bunny', 'kg', 'Long-staple Bt cotton variety'),
  ('Banana', 'Grand Nain', 'kg', 'Cavendish dessert banana variety'),
  ('Mango', 'Banganapalli', 'kg', 'Premium Andhra mango variety'),
  ('Turmeric', 'Sangli', 'kg', 'Curcumin-rich turmeric variety')
ON CONFLICT (name) DO NOTHING;

-- 3. Add custom_crop_name column to crop_listings for "Other crop" support
ALTER TABLE public.crop_listings ADD COLUMN IF NOT EXISTS custom_crop_name text;

-- 4. Map existing Available listings to Harvested (do not delete records)
UPDATE public.crop_listings SET status = 'Harvested' WHERE status = 'Available';

-- 5. Add CHECK constraint to enforce only Upcoming and Harvested statuses
ALTER TABLE public.crop_listings DROP CONSTRAINT IF EXISTS crop_listings_status_check;
ALTER TABLE public.crop_listings ADD CONSTRAINT crop_listings_status_check
  CHECK (status IN ('Upcoming', 'Harvested'));
