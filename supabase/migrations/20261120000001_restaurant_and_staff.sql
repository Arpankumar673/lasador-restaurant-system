-- ==============================================================================
-- L'ASADOR – GRILL & BREW | INDEPENDENT SUPABASE FOUNDATION
-- Migration: 20261120000001_restaurant_and_staff.sql
-- Scope: Restaurant Configuration, Staff Roles, Profiles & RBAC Functions
-- Single Restaurant Architecture (Mohali, Punjab)
-- ==============================================================================

-- 1. Automatic updated_at Trigger Function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Staff Roles Enum & Reference
DO $$ BEGIN
  CREATE TYPE staff_role AS ENUM ('owner', 'admin', 'manager', 'kitchen', 'bar');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS staff_roles (
  role staff_role PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO staff_roles (role, name, description) VALUES
  ('owner', 'Restaurant Owner', 'Full operational, financial, and administrative control'),
  ('admin', 'System Administrator', 'Complete system, menu, staff, and configuration access'),
  ('manager', 'Floor & Operations Manager', 'Menu availability, table management, live orders, and bill settlement'),
  ('kitchen', 'Kitchen Station Operator', 'Kitchen display system (KDS) order receipt and prep updates'),
  ('bar', 'Brewery & Bar Operator', 'Bar display system (BDS) craft beer and cocktail prep updates')
ON CONFLICT (role) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 3. Staff Permissions Table
CREATE TABLE IF NOT EXISTS staff_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role staff_role NOT NULL REFERENCES staff_roles(role) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role, permission_key)
);

INSERT INTO staff_permissions (role, permission_key, description) VALUES
  -- Owner permissions
  ('owner', 'settings:manage', 'Manage restaurant settings, taxes, and operating hours'),
  ('owner', 'staff:manage', 'Invite, configure, and manage staff accounts and roles'),
  ('owner', 'menu:manage', 'Create, update, and archive menu categories and products'),
  ('owner', 'tables:manage', 'Manage dining tables and generate QR tokens'),
  ('owner', 'orders:view_all', 'View all incoming and historical customer orders'),
  ('owner', 'orders:manage', 'Accept, cancel, or reassign orders'),
  ('owner', 'bills:settle', 'Settle table bills and register cash/UPI payments'),
  ('owner', 'analytics:view', 'Access financial analytics, settlement audit, and reports'),

  -- Admin permissions
  ('admin', 'settings:manage', 'Manage restaurant settings, taxes, and operating hours'),
  ('admin', 'staff:manage', 'Invite, configure, and manage staff accounts and roles'),
  ('admin', 'menu:manage', 'Create, update, and archive menu categories and products'),
  ('admin', 'tables:manage', 'Manage dining tables and generate QR tokens'),
  ('admin', 'orders:view_all', 'View all incoming and historical customer orders'),
  ('admin', 'orders:manage', 'Accept, cancel, or reassign orders'),
  ('admin', 'bills:settle', 'Settle table bills and register cash/UPI payments'),
  ('admin', 'analytics:view', 'Access financial analytics, settlement audit, and reports'),

  -- Manager permissions
  ('manager', 'menu:manage', 'Toggle availability of products, variants, and modifiers'),
  ('manager', 'tables:manage', 'Assign tables, open/close dining sessions, generate QR codes'),
  ('manager', 'orders:view_all', 'View all live orders across stations'),
  ('manager', 'orders:manage', 'Modify order statuses and expedite tickets'),
  ('manager', 'bills:settle', 'Settle table bills and register customer payments'),

  -- Kitchen permissions
  ('kitchen', 'orders:view_kitchen', 'View kitchen display tickets (Grill, Fry, Cold)'),
  ('kitchen', 'orders:update_kitchen', 'Update preparation status of kitchen line items'),

  -- Bar permissions
  ('bar', 'orders:view_bar', 'View bar display tickets (Craft Taps, Cocktails)'),
  ('bar', 'orders:update_bar', 'Update preparation status of beverage line items')
ON CONFLICT (role, permission_key) DO NOTHING;

-- 4. Staff Profiles Table (Links 1-to-1 with Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role staff_role NOT NULL DEFAULT 'kitchen',
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- 5. RBAC Helper Functions (SECURITY DEFINER with fixed search_path for safety)
CREATE OR REPLACE FUNCTION get_auth_role()
RETURNS staff_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active = true LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION is_owner_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_active = true AND role IN ('owner', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION is_manager_or_above()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_active = true AND role IN ('owner', 'admin', 'manager')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- 6. Restaurant Settings Table (Singleton pattern for single restaurant)
CREATE TABLE IF NOT EXISTS restaurant_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name TEXT NOT NULL DEFAULT 'L''Asador – Grill & Brew',
  tagline TEXT DEFAULT 'Artisanal Wood-Fired Grill & Craft Microbrewery',
  description TEXT DEFAULT 'Prime wood-fired cuts and small-batch craft microbrewery in Mohali, Punjab.',
  address_line1 TEXT NOT NULL DEFAULT 'Sector 82, JLPL Industrial Area',
  address_line2 TEXT,
  city TEXT NOT NULL DEFAULT 'Mohali',
  state TEXT NOT NULL DEFAULT 'Punjab',
  pincode TEXT NOT NULL DEFAULT '140308',
  country TEXT NOT NULL DEFAULT 'India',
  phone TEXT NOT NULL DEFAULT '+91 98765 43210',
  email TEXT NOT NULL DEFAULT 'reservations@lasador.in',
  gst_number TEXT,
  fssai_license TEXT,
  currency TEXT NOT NULL DEFAULT 'INR',
  currency_symbol TEXT NOT NULL DEFAULT '₹',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  is_ordering_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trigger_restaurant_settings_updated_at ON restaurant_settings;
CREATE TRIGGER trigger_restaurant_settings_updated_at
  BEFORE UPDATE ON restaurant_settings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- 7. Business Operating Hours Table
CREATE TABLE IF NOT EXISTS business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  day_name TEXT NOT NULL,
  open_time TIME NOT NULL DEFAULT '12:00:00',
  close_time TIME NOT NULL DEFAULT '23:30:00',
  is_closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_business_hours_day ON business_hours(day_of_week);

DROP TRIGGER IF EXISTS trigger_business_hours_updated_at ON business_hours;
CREATE TRIGGER trigger_business_hours_updated_at
  BEFORE UPDATE ON business_hours
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- 8. Tax & Service Charge Settings Table
CREATE TABLE IF NOT EXISTS tax_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  rate_percentage NUMERIC(5, 2) NOT NULL CHECK (rate_percentage >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  is_inclusive BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tax_settings_code ON tax_settings(code);

DROP TRIGGER IF EXISTS trigger_tax_settings_updated_at ON tax_settings;
CREATE TRIGGER trigger_tax_settings_updated_at
  BEFORE UPDATE ON tax_settings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
