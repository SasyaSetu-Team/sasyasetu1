-- PART 2: Standardize every farmer's location to Warangal, Telangana
-- Farmer-role data only; Buyer/FPO/Storage/Transport accounts untouched.

-- 1. profiles.home_location → 'Warangal, Telangana' for all 4 farmer accounts
UPDATE profiles
SET home_location = 'Warangal, Telangana'
WHERE id IN (
  SELECT ur.user_id
  FROM user_roles ur
  WHERE ur.role = 'Farmer'
);

-- 2. crop_listings.location_area → 'Warangal' for every listing owned by any farmer
UPDATE crop_listings
SET location_area = 'Warangal'
WHERE owner_id IN (
  SELECT ur.user_id
  FROM user_roles ur
  WHERE ur.role = 'Farmer'
)
AND location_area != 'Warangal';

-- 3. crop_clusters.location_area → 'Warangal' for any cluster not already Warangal
UPDATE crop_clusters
SET location_area = 'Warangal'
WHERE location_area != 'Warangal';
