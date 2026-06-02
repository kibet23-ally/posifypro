-- =========================================================
-- POSify Pro: Convert single-tenant POS into multi-tenant SaaS
-- =========================================================

-- 1. Roles enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('owner', 'manager', 'cashier');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Organizations (one per signup)
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL,
  license_status text NOT NULL DEFAULT 'trial', -- trial | lifetime | expired
  license_expires_at timestamptz,               -- for trial
  purchased_at timestamptz,
  stripe_payment_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 3. Organization members
CREATE TABLE IF NOT EXISTS public.organization_members (
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'cashier',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS organization_members_user_unique ON public.organization_members(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 4. Security definer helpers (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_org(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT org_id FROM public.organization_members WHERE user_id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = _user_id AND org_id = _org_id);
$$;

-- 5. Organizations RLS
DROP POLICY IF EXISTS orgs_select ON public.organizations;
CREATE POLICY orgs_select ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), id));

DROP POLICY IF EXISTS orgs_insert ON public.organizations;
CREATE POLICY orgs_insert ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS orgs_update_owner ON public.organizations;
CREATE POLICY orgs_update_owner ON public.organizations FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- 6. Organization members RLS
DROP POLICY IF EXISTS members_select ON public.organization_members;
CREATE POLICY members_select ON public.organization_members FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));

DROP POLICY IF EXISTS members_insert_self ON public.organization_members;
CREATE POLICY members_insert_self ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 7. Add org_id to all tenant tables
ALTER TABLE public.products      ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE public.customers     ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE public.sales         ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE public.sale_items    ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE public.settings      ADD COLUMN IF NOT EXISTS org_id uuid;

-- Indexes
CREATE INDEX IF NOT EXISTS products_org_idx   ON public.products(org_id);
CREATE INDEX IF NOT EXISTS customers_org_idx  ON public.customers(org_id);
CREATE INDEX IF NOT EXISTS sales_org_idx      ON public.sales(org_id);
CREATE INDEX IF NOT EXISTS sale_items_org_idx ON public.sale_items(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS settings_org_unique ON public.settings(org_id);

-- 8. Replace tenant-table policies with org-scoped versions
DROP POLICY IF EXISTS staff_all_products    ON public.products;
DROP POLICY IF EXISTS staff_all_customers   ON public.customers;
DROP POLICY IF EXISTS staff_all_sales       ON public.sales;
DROP POLICY IF EXISTS staff_all_sale_items  ON public.sale_items;
DROP POLICY IF EXISTS staff_all_settings    ON public.settings;

CREATE POLICY org_all_products ON public.products FOR ALL TO authenticated
  USING (org_id = public.get_user_org(auth.uid()))
  WITH CHECK (org_id = public.get_user_org(auth.uid()));

CREATE POLICY org_all_customers ON public.customers FOR ALL TO authenticated
  USING (org_id = public.get_user_org(auth.uid()))
  WITH CHECK (org_id = public.get_user_org(auth.uid()));

CREATE POLICY org_all_sales ON public.sales FOR ALL TO authenticated
  USING (org_id = public.get_user_org(auth.uid()))
  WITH CHECK (org_id = public.get_user_org(auth.uid()));

CREATE POLICY org_all_sale_items ON public.sale_items FOR ALL TO authenticated
  USING (org_id = public.get_user_org(auth.uid()))
  WITH CHECK (org_id = public.get_user_org(auth.uid()));

CREATE POLICY org_all_settings ON public.settings FOR ALL TO authenticated
  USING (org_id = public.get_user_org(auth.uid()))
  WITH CHECK (org_id = public.get_user_org(auth.uid()));

-- 9. Add org_id to profiles (so we know which org a user belongs to without a join)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS org_id uuid;

-- 10. Replace handle_new_user: create org, owner membership, settings, profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_org_id uuid;
  biz_name text;
  user_name text;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1));
  biz_name  := COALESCE(NEW.raw_user_meta_data->>'business_name', user_name || '''s Shop');

  -- Create organization with 14-day trial
  INSERT INTO public.organizations (name, owner_id, license_status, license_expires_at)
  VALUES (biz_name, NEW.id, 'trial', now() + interval '14 days')
  RETURNING id INTO new_org_id;

  -- Add owner membership
  INSERT INTO public.organization_members (org_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  -- Create profile linked to org
  INSERT INTO public.profiles (id, email, name, role, org_id)
  VALUES (NEW.id, NEW.email, user_name, 'owner', new_org_id)
  ON CONFLICT (id) DO UPDATE SET org_id = EXCLUDED.org_id, role = 'owner';

  -- Default settings for org
  INSERT INTO public.settings (org_id, business_name)
  VALUES (new_org_id, biz_name);

  RETURN NEW;
END;
$$;

-- 11. Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
