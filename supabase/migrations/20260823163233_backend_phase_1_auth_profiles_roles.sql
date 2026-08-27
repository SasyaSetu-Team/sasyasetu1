/*
# Backend Phase 1: authentication, profiles, and authoritative roles

1. Purpose
- Adds the minimum backend foundation for the existing demo UI.
- Supabase Auth remains the only identity source.
- `user_roles` is the only source of role authority; no profile column grants permissions.

2. New Tables
- `profiles`
  - `id`: the authenticated user's ID, linked to `auth.users`.
  - `display_name`: the user's editable display name.
  - `language`: the user's editable language preference.
  - `buyer_category`: the buyer category selected during demo onboarding.
  - `created_at` and `updated_at`: audit timestamps.
- `user_roles`
  - `user_id`: the authenticated user's ID.
  - `role`: one authoritative application role: Farmer, Buyer, FPO, Storage Provider, Transport Provider, Moderator, or Admin.
  - `created_at`: role assignment timestamp.

3. Security
- Row-level security is enabled on both tables.
- Profiles are readable and editable only by their owner.
- User roles are readable only by their owner.
- Authenticated clients cannot insert, update, or delete roles directly.
- Profile privilege columns are restricted so role authority cannot be placed in profile data.
- `claim_demo_role` is a SECURITY DEFINER function that only accepts the fixed demo account email for the requested role and derives the user ID from `auth.uid()`.

4. Important Notes
- The demo account claim function is intentionally limited to the seven fixed demo email addresses used by the Phase 1 frontend flow.
- No crop, booking, deal, storage, transport, payment, dispute, notification, document, map, API, or external integration tables are created.
*/

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  language text NOT NULL DEFAULT 'English' CHECK (language IN ('English', 'తెలుగు', 'हिन्दी')),
  buyer_category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('Farmer', 'Buyer', 'FPO', 'Storage Provider', 'Transport Provider', 'Moderator', 'Admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.profiles FROM anon;
REVOKE ALL ON TABLE public.user_roles FROM anon;
GRANT SELECT, INSERT ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.user_roles TO authenticated;
REVOKE UPDATE ON TABLE public.profiles FROM authenticated;
GRANT UPDATE (display_name, language, buyer_category) ON TABLE public.profiles TO authenticated;
REVOKE DELETE ON TABLE public.profiles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.user_roles FROM authenticated;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_roles_insert_denied" ON public.user_roles;
CREATE POLICY "user_roles_insert_denied" ON public.user_roles FOR INSERT
  TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "user_roles_update_denied" ON public.user_roles;
CREATE POLICY "user_roles_update_denied" ON public.user_roles FOR UPDATE
  TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "user_roles_delete_denied" ON public.user_roles;
CREATE POLICY "user_roles_delete_denied" ON public.user_roles FOR DELETE
  TO authenticated USING (false);

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

  IF v_email <> lower('demo.farmer@sasyasetu.demo') AND p_role = 'Farmer' THEN
    RAISE EXCEPTION 'Demo account does not match role';
  ELSIF v_email <> lower('demo.buyer@sasyasetu.demo') AND p_role = 'Buyer' THEN
    RAISE EXCEPTION 'Demo account does not match role';
  ELSIF v_email <> lower('demo.fpo@sasyasetu.demo') AND p_role = 'FPO' THEN
    RAISE EXCEPTION 'Demo account does not match role';
  ELSIF v_email <> lower('demo.storage@sasyasetu.demo') AND p_role = 'Storage Provider' THEN
    RAISE EXCEPTION 'Demo account does not match role';
  ELSIF v_email <> lower('demo.transport@sasyasetu.demo') AND p_role = 'Transport Provider' THEN
    RAISE EXCEPTION 'Demo account does not match role';
  ELSIF v_email <> lower('demo.moderator@sasyasetu.demo') AND p_role = 'Moderator' THEN
    RAISE EXCEPTION 'Demo account does not match role';
  ELSIF v_email <> lower('demo.admin@sasyasetu.demo') AND p_role = 'Admin' THEN
    RAISE EXCEPTION 'Demo account does not match role';
  END IF;

  v_display_name := CASE p_role
    WHEN 'Farmer' THEN 'Ramesh Kumar'
    WHEN 'Buyer' THEN 'Venkat Reddy'
    WHEN 'FPO' THEN 'Warangal Farmers FPO'
    WHEN 'Storage Provider' THEN 'Krishna Cold Storage'
    WHEN 'Transport Provider' THEN 'Suresh Transport Services'
    WHEN 'Moderator' THEN 'Sasya Setu Moderator'
    WHEN 'Admin' THEN 'Sasya Setu Admin'
  END;

  INSERT INTO public.profiles (id, display_name)
  VALUES (v_user_id, v_display_name)
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

REVOKE ALL ON FUNCTION public.claim_demo_role(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_demo_role(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_demo_role(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_profile_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_profile_updated_at();
