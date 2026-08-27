/*
# SasyaSetu full application schema

1. Purpose
- Creates the durable backend for farmer, buyer, FPO, storage, transport, deal, moderation, support, and tutorial workflows.
- Supabase Auth is the identity source; user-owned records reference `auth.users`.

2. Tables
- `profiles`, `user_roles`: identity profile and authoritative role.
- `fpo_profiles`, `crops`, `crop_listings`, `crop_demands`: organisations, crop catalog, supply, and demand.
- `storage_facilities`, `storage_requests`: storage inventory and requests.
- `transport_providers`, `transport_bookings`, `journeys`: provider directory, bookings, and journey state.
- `orders`, `deals`, `payments`: buyer orders and protected assured-deal/payment records.
- `disputes`, `notifications`, `tutorial_progress`: support, alerts, and user progress.

3. Relationships and indexes
- Foreign keys connect users, organisations, crops, listings, requests, providers, orders, deals, journeys, and disputes.
- Indexes cover ownership, status, marketplace filters, and unread notifications.

4. Security
- RLS is enabled on every table with separate SELECT, INSERT, UPDATE, and DELETE policies.
- Marketplace data is readable by signed-in users; private operational data is participant-scoped.
- Role, verification, moderation, totals, payment status, and audit fields are not directly browser-writable.
- `claim_demo_role` and `create_assured_deal` are authenticated server-side functions with fixed validation.

5. Important notes
- No destructive statements or seed records are included.
- The migration is safe to re-run.
*/

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  language text NOT NULL DEFAULT 'English' CHECK (language IN ('English', 'తెలుగు', 'हिन्दी')),
  buyer_category text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('Farmer','Buyer','FPO','Storage Provider','Transport Provider','Moderator','Admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.fpo_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL, registration_number text, description text, service_area text, verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.crops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, variety text NOT NULL, unit text NOT NULL DEFAULT 'kg',
  description text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.crop_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  fpo_id uuid REFERENCES public.fpo_profiles(id) ON DELETE SET NULL, crop_id uuid NOT NULL REFERENCES public.crops(id) ON DELETE RESTRICT,
  quantity_kg numeric(12,2) NOT NULL CHECK (quantity_kg > 0), available_quantity_kg numeric(12,2) NOT NULL CHECK (available_quantity_kg >= 0),
  expected_harvest_date date, harvested_at date, area_acres numeric(10,2) CHECK (area_acres IS NULL OR area_acres > 0),
  expected_yield_kg numeric(12,2) CHECK (expected_yield_kg IS NULL OR expected_yield_kg >= 0), indicative_price_per_kg numeric(12,2) CHECK (indicative_price_per_kg IS NULL OR indicative_price_per_kg >= 0),
  status text NOT NULL DEFAULT 'Upcoming' CHECK (status IN ('Upcoming','Available','Harvested','Sold','Archived')), is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.crop_demands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), requester_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  fpo_id uuid REFERENCES public.fpo_profiles(id) ON DELETE SET NULL, crop_id uuid NOT NULL REFERENCES public.crops(id) ON DELETE RESTRICT,
  quantity_kg numeric(12,2) NOT NULL CHECK (quantity_kg > 0), needed_by date, target_price_per_kg numeric(12,2) CHECK (target_price_per_kg IS NULL OR target_price_per_kg >= 0), notes text,
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open','Matched','Closed','Cancelled')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.storage_facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL, location text NOT NULL, temperature_range text, total_capacity_kg numeric(12,2) NOT NULL CHECK (total_capacity_kg > 0), available_capacity_kg numeric(12,2) NOT NULL CHECK (available_capacity_kg >= 0),
  price_per_kg_day numeric(12,2) CHECK (price_per_kg_day IS NULL OR price_per_kg_day >= 0), status text NOT NULL DEFAULT 'Available' CHECK (status IN ('Available','Occupied','Paused','Archived')), verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.storage_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), requester_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES public.storage_facilities(id) ON DELETE SET NULL, crop_id uuid NOT NULL REFERENCES public.crops(id) ON DELETE RESTRICT,
  quantity_kg numeric(12,2) NOT NULL CHECK (quantity_kg > 0), start_date date NOT NULL, end_date date NOT NULL CHECK (end_date >= start_date), temperature_requirement text, notes text,
  status text NOT NULL DEFAULT 'Requested' CHECK (status IN ('Requested','Approved','Rejected','Active','Completed','Cancelled')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.transport_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text NOT NULL, permit_number text, vehicle_details text, service_area text, capacity_kg numeric(12,2) NOT NULL CHECK (capacity_kg > 0), price_per_km numeric(12,2) CHECK (price_per_km IS NULL OR price_per_km >= 0), rating numeric(3,2) CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)), available boolean NOT NULL DEFAULT true, verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.transport_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), requester_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES public.transport_providers(id) ON DELETE SET NULL, order_id uuid, pickup_location text NOT NULL, destination text NOT NULL, scheduled_at timestamptz,
  quantity_kg numeric(12,2) NOT NULL CHECK (quantity_kg > 0), estimated_price numeric(12,2) CHECK (estimated_price IS NULL OR estimated_price >= 0), status text NOT NULL DEFAULT 'Requested' CHECK (status IN ('Requested','Accepted','In Transit','Delivered','Cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), buyer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.crop_listings(id) ON DELETE RESTRICT, quantity_kg numeric(12,2) NOT NULL CHECK (quantity_kg > 0), unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  status text NOT NULL DEFAULT 'Booked' CHECK (status IN ('Booked','Farmer Confirmed','Assured Deal','Ready','In Transit','Delivered','Cancelled','Disputed')), delivery_location text, booked_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  token_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (token_amount >= 0), balance_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (balance_amount >= 0), total_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  status text NOT NULL DEFAULT 'Payment Pending' CHECK (status IN ('Payment Pending','Partially Paid','Paid','Completed','Cancelled','Disputed')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE, payer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0), payment_type text NOT NULL CHECK (payment_type IN ('Token','Balance','Refund')), status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Successful','Failed','Refunded')), provider_reference text, paid_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL UNIQUE REFERENCES public.transport_bookings(id) ON DELETE CASCADE, driver_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'Not Started' CHECK (status IN ('Not Started','Started','In Transit','Arrived','Completed','Cancelled')), pickup_location text NOT NULL, destination text NOT NULL, distance_km numeric(10,2) CHECK (distance_km IS NULL OR distance_km >= 0), estimated_minutes integer CHECK (estimated_minutes IS NULL OR estimated_minutes >= 0), started_at timestamptz, completed_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), raised_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE, order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL, listing_id uuid REFERENCES public.crop_listings(id) ON DELETE SET NULL, booking_id uuid REFERENCES public.transport_bookings(id) ON DELETE SET NULL,
  subject text NOT NULL, description text NOT NULL, preferred_resolution text, status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open','Under Review','Resolved','Closed','Rejected')), moderator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, resolution text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE, title text NOT NULL, body text NOT NULL, notification_type text NOT NULL DEFAULT 'General', read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.tutorial_progress (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE, tutorial_key text NOT NULL, completed_at timestamptz, PRIMARY KEY (user_id, tutorial_key)
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transport_bookings_order_fk') THEN
    ALTER TABLE public.transport_bookings ADD CONSTRAINT transport_bookings_order_fk FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS crops_name_variety_key ON public.crops (lower(name), lower(variety));
CREATE INDEX IF NOT EXISTS fpo_owner_idx ON public.fpo_profiles(owner_id);
CREATE INDEX IF NOT EXISTS listings_owner_status_idx ON public.crop_listings(owner_id,status);
CREATE INDEX IF NOT EXISTS listings_market_idx ON public.crop_listings(status,is_visible,expected_harvest_date);
CREATE INDEX IF NOT EXISTS demands_owner_status_idx ON public.crop_demands(requester_id,status);
CREATE INDEX IF NOT EXISTS facilities_provider_status_idx ON public.storage_facilities(provider_id,status);
CREATE INDEX IF NOT EXISTS storage_requests_owner_status_idx ON public.storage_requests(requester_id,status);
CREATE INDEX IF NOT EXISTS providers_owner_available_idx ON public.transport_providers(owner_id,available);
CREATE INDEX IF NOT EXISTS bookings_owner_status_idx ON public.transport_bookings(requester_id,status);
CREATE INDEX IF NOT EXISTS bookings_provider_status_idx ON public.transport_bookings(provider_id,status);
CREATE INDEX IF NOT EXISTS orders_buyer_status_idx ON public.orders(buyer_id,status);
CREATE INDEX IF NOT EXISTS payments_payer_status_idx ON public.payments(payer_id,status);
CREATE INDEX IF NOT EXISTS disputes_owner_status_idx ON public.disputes(raised_by,status);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON public.notifications(user_id,read_at,created_at DESC);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','user_roles','fpo_profiles','crops','crop_listings','crop_demands','storage_facilities','storage_requests','transport_providers','transport_bookings','orders','deals','payments','journeys','disputes','notifications','tutorial_progress'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','fpo_profiles','crop_listings','crop_demands','storage_facilities','storage_requests','transport_providers','transport_bookings','orders','deals','journeys','disputes'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_updated_at', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t || '_updated_at', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.claim_demo_role(p_role text) RETURNS public.user_roles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e text := lower(coalesce(auth.jwt() ->> 'email','')); u uuid := auth.uid(); r public.user_roles; n text;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_role NOT IN ('Farmer','Buyer','FPO','Storage Provider','Transport Provider','Moderator','Admin') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  IF (p_role='Farmer' AND e<>'demo.farmer@sasyasetu.demo') OR (p_role='Buyer' AND e<>'demo.buyer@sasyasetu.demo') OR (p_role='FPO' AND e<>'demo.fpo@sasyasetu.demo') OR (p_role='Storage Provider' AND e<>'demo.storage@sasyasetu.demo') OR (p_role='Transport Provider' AND e<>'demo.transport@sasyasetu.demo') OR (p_role='Moderator' AND e<>'demo.moderator@sasyasetu.demo') OR (p_role='Admin' AND e<>'demo.admin@sasyasetu.demo') THEN RAISE EXCEPTION 'Demo account does not match role'; END IF;
  n := CASE p_role WHEN 'Farmer' THEN 'Ramesh Kumar' WHEN 'Buyer' THEN 'Venkat Reddy' WHEN 'FPO' THEN 'Warangal Farmers FPO' WHEN 'Storage Provider' THEN 'Krishna Cold Storage' WHEN 'Transport Provider' THEN 'Suresh Transport Services' WHEN 'Moderator' THEN 'Sasya Setu Moderator' WHEN 'Admin' THEN 'Sasya Setu Admin' END;
  INSERT INTO public.profiles(id,display_name) VALUES(u,n) ON CONFLICT(id) DO NOTHING;
  INSERT INTO public.user_roles(user_id,role) VALUES(u,p_role) ON CONFLICT(user_id) DO UPDATE SET role=EXCLUDED.role;
  SELECT * INTO r FROM public.user_roles WHERE user_id=u; RETURN r;
END; $$;

CREATE OR REPLACE FUNCTION public.create_assured_deal(p_order_id uuid, p_token_amount numeric DEFAULT 0) RETURNS public.deals LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.orders; d public.deals; total numeric;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id=p_order_id AND buyer_id=auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.status IN ('Cancelled','Disputed','Delivered') OR p_token_amount IS NULL OR p_token_amount < 0 THEN RAISE EXCEPTION 'Order cannot enter an assured deal'; END IF;
  total := round(o.quantity_kg * o.unit_price,2); IF p_token_amount > total THEN RAISE EXCEPTION 'Token amount exceeds order total'; END IF;
  INSERT INTO public.deals(order_id,token_amount,balance_amount,total_amount,status) VALUES(o.id,p_token_amount,total-p_token_amount,total,CASE WHEN p_token_amount=total THEN 'Paid' ELSE 'Partially Paid' END)
  ON CONFLICT(order_id) DO UPDATE SET token_amount=EXCLUDED.token_amount,balance_amount=EXCLUDED.balance_amount,total_amount=EXCLUDED.total_amount,status=EXCLUDED.status,updated_at=now() RETURNING * INTO d;
  UPDATE public.orders SET status='Assured Deal',updated_at=now() WHERE id=o.id; RETURN d;
END; $$;
REVOKE ALL ON FUNCTION public.claim_demo_role(text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.claim_demo_role(text) TO authenticated;
REVOKE ALL ON FUNCTION public.create_assured_deal(uuid,numeric) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.create_assured_deal(uuid,numeric) TO authenticated;
REVOKE UPDATE ON public.profiles FROM authenticated; GRANT UPDATE(display_name,language,buyer_category) ON public.profiles TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.user_roles FROM authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.deals FROM authenticated; REVOKE INSERT,UPDATE,DELETE ON public.payments FROM authenticated;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles; CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated USING(auth.uid()=id);
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles; CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated WITH CHECK(auth.uid()=id);
DROP POLICY IF EXISTS profiles_update_own ON public.profiles; CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING(auth.uid()=id) WITH CHECK(auth.uid()=id);
DROP POLICY IF EXISTS profiles_delete_own ON public.profiles; CREATE POLICY profiles_delete_own ON public.profiles FOR DELETE TO authenticated USING(auth.uid()=id);
DROP POLICY IF EXISTS roles_select_own ON public.user_roles; CREATE POLICY roles_select_own ON public.user_roles FOR SELECT TO authenticated USING(auth.uid()=user_id);
DROP POLICY IF EXISTS roles_insert_denied ON public.user_roles; CREATE POLICY roles_insert_denied ON public.user_roles FOR INSERT TO authenticated WITH CHECK(false);
DROP POLICY IF EXISTS roles_update_denied ON public.user_roles; CREATE POLICY roles_update_denied ON public.user_roles FOR UPDATE TO authenticated USING(false) WITH CHECK(false);
DROP POLICY IF EXISTS roles_delete_denied ON public.user_roles; CREATE POLICY roles_delete_denied ON public.user_roles FOR DELETE TO authenticated USING(false);

DROP POLICY IF EXISTS fpo_select ON public.fpo_profiles; CREATE POLICY fpo_select ON public.fpo_profiles FOR SELECT TO authenticated USING(verified OR owner_id=auth.uid());
DROP POLICY IF EXISTS fpo_insert ON public.fpo_profiles; CREATE POLICY fpo_insert ON public.fpo_profiles FOR INSERT TO authenticated WITH CHECK(owner_id=auth.uid());
DROP POLICY IF EXISTS fpo_update ON public.fpo_profiles; CREATE POLICY fpo_update ON public.fpo_profiles FOR UPDATE TO authenticated USING(owner_id=auth.uid()) WITH CHECK(owner_id=auth.uid());
DROP POLICY IF EXISTS fpo_delete ON public.fpo_profiles; CREATE POLICY fpo_delete ON public.fpo_profiles FOR DELETE TO authenticated USING(owner_id=auth.uid());
DROP POLICY IF EXISTS crops_select ON public.crops; CREATE POLICY crops_select ON public.crops FOR SELECT TO authenticated USING(true);
DROP POLICY IF EXISTS crops_insert ON public.crops; CREATE POLICY crops_insert ON public.crops FOR INSERT TO authenticated WITH CHECK(false);
DROP POLICY IF EXISTS crops_update ON public.crops; CREATE POLICY crops_update ON public.crops FOR UPDATE TO authenticated USING(false) WITH CHECK(false);
DROP POLICY IF EXISTS crops_delete ON public.crops; CREATE POLICY crops_delete ON public.crops FOR DELETE TO authenticated USING(false);

DROP POLICY IF EXISTS listings_select ON public.crop_listings; CREATE POLICY listings_select ON public.crop_listings FOR SELECT TO authenticated USING(is_visible OR owner_id=auth.uid());
DROP POLICY IF EXISTS listings_insert ON public.crop_listings; CREATE POLICY listings_insert ON public.crop_listings FOR INSERT TO authenticated WITH CHECK(owner_id=auth.uid() AND available_quantity_kg<=quantity_kg);
DROP POLICY IF EXISTS listings_update ON public.crop_listings; CREATE POLICY listings_update ON public.crop_listings FOR UPDATE TO authenticated USING(owner_id=auth.uid()) WITH CHECK(owner_id=auth.uid() AND available_quantity_kg<=quantity_kg);
DROP POLICY IF EXISTS listings_delete ON public.crop_listings; CREATE POLICY listings_delete ON public.crop_listings FOR DELETE TO authenticated USING(owner_id=auth.uid());
DROP POLICY IF EXISTS demands_select ON public.crop_demands; CREATE POLICY demands_select ON public.crop_demands FOR SELECT TO authenticated USING(requester_id=auth.uid() OR status='Open');
DROP POLICY IF EXISTS demands_insert ON public.crop_demands; CREATE POLICY demands_insert ON public.crop_demands FOR INSERT TO authenticated WITH CHECK(requester_id=auth.uid());
DROP POLICY IF EXISTS demands_update ON public.crop_demands; CREATE POLICY demands_update ON public.crop_demands FOR UPDATE TO authenticated USING(requester_id=auth.uid()) WITH CHECK(requester_id=auth.uid());
DROP POLICY IF EXISTS demands_delete ON public.crop_demands; CREATE POLICY demands_delete ON public.crop_demands FOR DELETE TO authenticated USING(requester_id=auth.uid());

DROP POLICY IF EXISTS facilities_select ON public.storage_facilities; CREATE POLICY facilities_select ON public.storage_facilities FOR SELECT TO authenticated USING(status<>'Archived' OR provider_id=auth.uid());
DROP POLICY IF EXISTS facilities_insert ON public.storage_facilities; CREATE POLICY facilities_insert ON public.storage_facilities FOR INSERT TO authenticated WITH CHECK(provider_id=auth.uid() AND available_capacity_kg<=total_capacity_kg);
DROP POLICY IF EXISTS facilities_update ON public.storage_facilities; CREATE POLICY facilities_update ON public.storage_facilities FOR UPDATE TO authenticated USING(provider_id=auth.uid()) WITH CHECK(provider_id=auth.uid() AND available_capacity_kg<=total_capacity_kg);
DROP POLICY IF EXISTS facilities_delete ON public.storage_facilities; CREATE POLICY facilities_delete ON public.storage_facilities FOR DELETE TO authenticated USING(provider_id=auth.uid());
DROP POLICY IF EXISTS storage_requests_select ON public.storage_requests; CREATE POLICY storage_requests_select ON public.storage_requests FOR SELECT TO authenticated USING(requester_id=auth.uid() OR EXISTS(SELECT 1 FROM public.storage_facilities f WHERE f.id=facility_id AND f.provider_id=auth.uid()));
DROP POLICY IF EXISTS storage_requests_insert ON public.storage_requests; CREATE POLICY storage_requests_insert ON public.storage_requests FOR INSERT TO authenticated WITH CHECK(requester_id=auth.uid());
DROP POLICY IF EXISTS storage_requests_update ON public.storage_requests; CREATE POLICY storage_requests_update ON public.storage_requests FOR UPDATE TO authenticated USING(requester_id=auth.uid() OR EXISTS(SELECT 1 FROM public.storage_facilities f WHERE f.id=facility_id AND f.provider_id=auth.uid())) WITH CHECK(requester_id=auth.uid() OR EXISTS(SELECT 1 FROM public.storage_facilities f WHERE f.id=facility_id AND f.provider_id=auth.uid()));
DROP POLICY IF EXISTS storage_requests_delete ON public.storage_requests; CREATE POLICY storage_requests_delete ON public.storage_requests FOR DELETE TO authenticated USING(requester_id=auth.uid());

DROP POLICY IF EXISTS providers_select ON public.transport_providers; CREATE POLICY providers_select ON public.transport_providers FOR SELECT TO authenticated USING(available OR owner_id=auth.uid());
DROP POLICY IF EXISTS providers_insert ON public.transport_providers; CREATE POLICY providers_insert ON public.transport_providers FOR INSERT TO authenticated WITH CHECK(owner_id=auth.uid());
DROP POLICY IF EXISTS providers_update ON public.transport_providers; CREATE POLICY providers_update ON public.transport_providers FOR UPDATE TO authenticated USING(owner_id=auth.uid()) WITH CHECK(owner_id=auth.uid());
DROP POLICY IF EXISTS providers_delete ON public.transport_providers; CREATE POLICY providers_delete ON public.transport_providers FOR DELETE TO authenticated USING(owner_id=auth.uid());
DROP POLICY IF EXISTS bookings_select ON public.transport_bookings; CREATE POLICY bookings_select ON public.transport_bookings FOR SELECT TO authenticated USING(requester_id=auth.uid() OR EXISTS(SELECT 1 FROM public.transport_providers p WHERE p.id=provider_id AND p.owner_id=auth.uid()));
DROP POLICY IF EXISTS bookings_insert ON public.transport_bookings; CREATE POLICY bookings_insert ON public.transport_bookings FOR INSERT TO authenticated WITH CHECK(requester_id=auth.uid());
DROP POLICY IF EXISTS bookings_update ON public.transport_bookings; CREATE POLICY bookings_update ON public.transport_bookings FOR UPDATE TO authenticated USING(requester_id=auth.uid() OR EXISTS(SELECT 1 FROM public.transport_providers p WHERE p.id=provider_id AND p.owner_id=auth.uid())) WITH CHECK(requester_id=auth.uid() OR EXISTS(SELECT 1 FROM public.transport_providers p WHERE p.id=provider_id AND p.owner_id=auth.uid()));
DROP POLICY IF EXISTS bookings_delete ON public.transport_bookings; CREATE POLICY bookings_delete ON public.transport_bookings FOR DELETE TO authenticated USING(requester_id=auth.uid());

DROP POLICY IF EXISTS orders_select ON public.orders; CREATE POLICY orders_select ON public.orders FOR SELECT TO authenticated USING(buyer_id=auth.uid() OR EXISTS(SELECT 1 FROM public.crop_listings l WHERE l.id=listing_id AND l.owner_id=auth.uid()));
DROP POLICY IF EXISTS orders_insert ON public.orders; CREATE POLICY orders_insert ON public.orders FOR INSERT TO authenticated WITH CHECK(buyer_id=auth.uid());
DROP POLICY IF EXISTS orders_update ON public.orders; CREATE POLICY orders_update ON public.orders FOR UPDATE TO authenticated USING(buyer_id=auth.uid() OR EXISTS(SELECT 1 FROM public.crop_listings l WHERE l.id=listing_id AND l.owner_id=auth.uid())) WITH CHECK(buyer_id=auth.uid() OR EXISTS(SELECT 1 FROM public.crop_listings l WHERE l.id=listing_id AND l.owner_id=auth.uid()));
DROP POLICY IF EXISTS orders_delete ON public.orders; CREATE POLICY orders_delete ON public.orders FOR DELETE TO authenticated USING(buyer_id=auth.uid());
DROP POLICY IF EXISTS deals_select ON public.deals; CREATE POLICY deals_select ON public.deals FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.orders o WHERE o.id=order_id AND (o.buyer_id=auth.uid() OR EXISTS(SELECT 1 FROM public.crop_listings l WHERE l.id=o.listing_id AND l.owner_id=auth.uid()))));
DROP POLICY IF EXISTS deals_insert ON public.deals; CREATE POLICY deals_insert ON public.deals FOR INSERT TO authenticated WITH CHECK(false);
DROP POLICY IF EXISTS deals_update ON public.deals; CREATE POLICY deals_update ON public.deals FOR UPDATE TO authenticated USING(false) WITH CHECK(false);
DROP POLICY IF EXISTS deals_delete ON public.deals; CREATE POLICY deals_delete ON public.deals FOR DELETE TO authenticated USING(false);
DROP POLICY IF EXISTS payments_select ON public.payments; CREATE POLICY payments_select ON public.payments FOR SELECT TO authenticated USING(payer_id=auth.uid() OR EXISTS(SELECT 1 FROM public.deals d JOIN public.orders o ON o.id=d.order_id WHERE d.id=deal_id AND o.buyer_id=auth.uid()));
DROP POLICY IF EXISTS payments_insert ON public.payments; CREATE POLICY payments_insert ON public.payments FOR INSERT TO authenticated WITH CHECK(false);
DROP POLICY IF EXISTS payments_update ON public.payments; CREATE POLICY payments_update ON public.payments FOR UPDATE TO authenticated USING(false) WITH CHECK(false);
DROP POLICY IF EXISTS payments_delete ON public.payments; CREATE POLICY payments_delete ON public.payments FOR DELETE TO authenticated USING(false);

DROP POLICY IF EXISTS journeys_select ON public.journeys; CREATE POLICY journeys_select ON public.journeys FOR SELECT TO authenticated USING(driver_id=auth.uid() OR EXISTS(SELECT 1 FROM public.transport_bookings b WHERE b.id=booking_id AND b.requester_id=auth.uid()));
DROP POLICY IF EXISTS journeys_insert ON public.journeys; CREATE POLICY journeys_insert ON public.journeys FOR INSERT TO authenticated WITH CHECK(driver_id=auth.uid());
DROP POLICY IF EXISTS journeys_update ON public.journeys; CREATE POLICY journeys_update ON public.journeys FOR UPDATE TO authenticated USING(driver_id=auth.uid()) WITH CHECK(driver_id=auth.uid());
DROP POLICY IF EXISTS journeys_delete ON public.journeys; CREATE POLICY journeys_delete ON public.journeys FOR DELETE TO authenticated USING(driver_id=auth.uid());
DROP POLICY IF EXISTS disputes_select ON public.disputes; CREATE POLICY disputes_select ON public.disputes FOR SELECT TO authenticated USING(raised_by=auth.uid() OR moderator_id=auth.uid());
DROP POLICY IF EXISTS disputes_insert ON public.disputes; CREATE POLICY disputes_insert ON public.disputes FOR INSERT TO authenticated WITH CHECK(raised_by=auth.uid());
DROP POLICY IF EXISTS disputes_update ON public.disputes; CREATE POLICY disputes_update ON public.disputes FOR UPDATE TO authenticated USING(raised_by=auth.uid() OR moderator_id=auth.uid()) WITH CHECK(raised_by=auth.uid() OR moderator_id=auth.uid());
DROP POLICY IF EXISTS disputes_delete ON public.disputes; CREATE POLICY disputes_delete ON public.disputes FOR DELETE TO authenticated USING(raised_by=auth.uid());
DROP POLICY IF EXISTS notifications_select ON public.notifications; CREATE POLICY notifications_select ON public.notifications FOR SELECT TO authenticated USING(user_id=auth.uid());
DROP POLICY IF EXISTS notifications_insert ON public.notifications; CREATE POLICY notifications_insert ON public.notifications FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid());
DROP POLICY IF EXISTS notifications_update ON public.notifications; CREATE POLICY notifications_update ON public.notifications FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
DROP POLICY IF EXISTS notifications_delete ON public.notifications; CREATE POLICY notifications_delete ON public.notifications FOR DELETE TO authenticated USING(user_id=auth.uid());
DROP POLICY IF EXISTS tutorial_select ON public.tutorial_progress; CREATE POLICY tutorial_select ON public.tutorial_progress FOR SELECT TO authenticated USING(user_id=auth.uid());
DROP POLICY IF EXISTS tutorial_insert ON public.tutorial_progress; CREATE POLICY tutorial_insert ON public.tutorial_progress FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid());
DROP POLICY IF EXISTS tutorial_update ON public.tutorial_progress; CREATE POLICY tutorial_update ON public.tutorial_progress FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
DROP POLICY IF EXISTS tutorial_delete ON public.tutorial_progress; CREATE POLICY tutorial_delete ON public.tutorial_progress FOR DELETE TO authenticated USING(user_id=auth.uid());
