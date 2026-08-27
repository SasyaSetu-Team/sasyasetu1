-- Fix: claim_demo_role inserted profiles without specifying language,
-- falling back to the column default 'English'. The language check constraint
-- was later tightened to only accept en/te/hi, so every login failed with
-- error 23514 (profiles_language_check). Set language='en' explicitly.

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

REVOKE ALL ON FUNCTION public.claim_demo_role(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_demo_role(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_demo_role(text) TO authenticated;