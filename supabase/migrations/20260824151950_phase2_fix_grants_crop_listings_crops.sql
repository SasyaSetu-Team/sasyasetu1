-- Fix: grant DML privileges to authenticated role on crop_listings and crops
-- Without these, RLS policies are ineffective — the authenticated role cannot SELECT/INSERT/UPDATE at all.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crop_listings TO authenticated;
GRANT SELECT ON public.crops TO authenticated;
