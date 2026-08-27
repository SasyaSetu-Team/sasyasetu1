-- Restore SELECT privileges on profiles and user_roles for authenticated users.
-- These were granted in the Phase 1 migration but lost during the full schema migration.

GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;