/*
# Add farmer verification columns to profiles and seed per-farmer data

## Summary
Adds four new columns to the profiles table to store farmer-specific
verification data that was previously hardcoded in the frontend. Seeds
distinct, realistic data for each of the 4 demo farmer accounts. Updates
claim_demo_role to accept all 4 farmer demo emails (was only accepting
demo.farmer@sasyasetu.demo).

## New Columns on profiles
1. home_location (text) — Farmer's home location string (e.g. "Warangal, Telangana")
2. farmer_verification_id (text) — Government-style verification ID (e.g. "TG-WGL-1042")
3. farmer_category (text) — Farmer category (e.g. "Land Owner", "Tenant Farmer")
4. verification_status (text, default 'Demo Verified') — Verification status

## Seeded Data
- Ramesh Kumar:  Warangal, Telangana     · TG-WGL-1042 · Land Owner    · Demo Verified
- Lakshmi Devi:  Khammam, Telangana      · TG-KHM-2053 · Tenant Farmer · Demo Verified
- Anjali Reddy:  Kadapa, Andhra Pradesh  · AP-KDP-3174 · Land Owner    · Demo Verified
- Prasad Rao:    Nalgonda, Telangana     · TG-NLG-4285 · Tenant Farmer · Demo Verified

## Security
- New columns are NOT added to the authenticated UPDATE grant — users
  cannot edit their own verification data. The existing grant remains
  GRANT UPDATE (display_name, language, buyer_category) only.
- claim_demo_role updated to accept all 4 farmer demo emails for the
  Farmer role check. Other role checks unchanged.
- RLS policies unchanged (profiles still owner-scoped SELECT/INSERT/UPDATE/DELETE).

## Important Notes
1. The display_name CASE in claim_demo_role is updated to map each
   farmer email to the correct name, though existing profiles already
   have correct names from prior seed migrations (ON CONFLICT DO NOTHING
   means the INSERT won't overwrite).
2. The new columns are nullable so non-farmer profiles are unaffected.
3. verification_status defaults to 'Demo Verified' so all profiles
   have a value even if not explicitly seeded.
*/

-- 1. Add new columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS home_location text,
  ADD COLUMN IF NOT EXISTS farmer_verification_id text,
  ADD COLUMN IF NOT EXISTS farmer_category text,
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'Demo Verified';

-- 2. Seed per-farmer verification data
UPDATE public.profiles SET
  home_location = 'Warangal, Telangana',
  farmer_verification_id = 'TG-WGL-1042',
  farmer_category = 'Land Owner',
  verification_status = 'Demo Verified'
WHERE display_name = 'Ramesh Kumar';

UPDATE public.profiles SET
  home_location = 'Khammam, Telangana',
  farmer_verification_id = 'TG-KHM-2053',
  farmer_category = 'Tenant Farmer',
  verification_status = 'Demo Verified'
WHERE display_name = 'Lakshmi Devi';

UPDATE public.profiles SET
  home_location = 'Kadapa, Andhra Pradesh',
  farmer_verification_id = 'AP-KDP-3174',
  farmer_category = 'Land Owner',
  verification_status = 'Demo Verified'
WHERE display_name = 'Anjali Reddy';

UPDATE public.profiles SET
  home_location = 'Nalgonda, Telangana',
  farmer_verification_id = 'TG-NLG-4285',
  farmer_category = 'Tenant Farmer',
  verification_status = 'Demo Verified'
WHERE display_name = 'Prasad Rao';

-- 3. Update claim_demo_role to accept all 4 farmer demo emails
CREATE OR REPLACE FUNCTION public.claim_demo_role(p_role text)
RETURNS public.user_roles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_user_id uuid := auth.uid();
  v_role public.user_roles;
  v_display_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_role NOT IN ('Farmer', 'Buyer', 'FPO', 'Storage Provider', 'Transport Provider', 'Moderator', 'Admin') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  IF p_role = 'Farmer' AND v_email NOT IN (
    lower('demo.farmer@sasyasetu.demo'),
    lower('lakshmi.farmer@demo.sasyasetu'),
    lower('anjali.farmer@demo.sasyasetu'),
    lower('prasad.farmer@demo.sasyasetu')
  ) THEN
    RAISE EXCEPTION 'Demo account does not match role';
  ELSIF p_role = 'Buyer' AND v_email <> lower('demo.buyer@sasyasetu.demo') THEN
    RAISE EXCEPTION 'Demo account does not match role';
  ELSIF p_role = 'FPO' AND v_email <> lower('demo.fpo@sasyasetu.demo') THEN
    RAISE EXCEPTION 'Demo account does not match role';
  ELSIF p_role = 'Storage Provider' AND v_email <> lower('demo.storage@sasyasetu.demo') THEN
    RAISE EXCEPTION 'Demo account does not match role';
  ELSIF p_role = 'Transport Provider' AND v_email <> lower('demo.transport@sasyasetu.demo') THEN
    RAISE EXCEPTION 'Demo account does not match role';
  ELSIF p_role = 'Moderator' AND v_email <> lower('demo.moderator@sasyasetu.demo') THEN
    RAISE EXCEPTION 'Demo account does not match role';
  ELSIF p_role = 'Admin' AND v_email <> lower('demo.admin@sasyasetu.demo') THEN
    RAISE EXCEPTION 'Demo account does not match role';
  END IF;

  v_display_name := CASE p_role
    WHEN 'Farmer' THEN CASE v_email
      WHEN lower('demo.farmer@sasyasetu.demo') THEN 'Ramesh Kumar'
      WHEN lower('lakshmi.farmer@demo.sasyasetu') THEN 'Lakshmi Devi'
      WHEN lower('anjali.farmer@demo.sasyasetu') THEN 'Anjali Reddy'
      WHEN lower('prasad.farmer@demo.sasyasetu') THEN 'Prasad Rao'
    END
    WHEN 'Buyer' THEN 'Venkat Reddy'
    WHEN 'FPO' THEN 'Warangal Farmers FPO'
    WHEN 'Storage Provider' THEN 'Krishna Cold Storage'
    WHEN 'Transport Provider' THEN 'Suresh Transport Services'
    WHEN 'Moderator' THEN 'Sasya Setu Moderator'
    WHEN 'Admin' THEN 'Sasya Setu Admin'
  END;

  INSERT INTO public.profiles (id, display_name, language)
  VALUES (v_user_id, v_display_name, 'en')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, p_role)
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

  SELECT ur.* INTO v_role
  FROM public.user_roles ur
  WHERE ur.user_id = v_user_id;

  RETURN v_role;
END;
$$;
