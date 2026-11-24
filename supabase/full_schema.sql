-- ==============================================================================
-- L'ASADOR – GRILL & BREW | INDEPENDENT SUPABASE FOUNDATION
-- Migration: 20261119000000_phase1_initial_setup.sql
-- Scope: Phase 1 Technical Foundation Setup
-- Location: Mohali, Punjab
-- ==============================================================================
-- IMPORTANT ARCHITECTURAL CONSTRAINTS:
-- 1. This database is strictly for L'Asador – Grill & Brew.
-- 2. Single-restaurant architecture. DO NOT add tenant_id or multi-tenant logic.
-- 3. Core tables (profiles, menu, tables, orders, KDS tickets, bills) will be
--    introduced in Phase 2 with strict Row Level Security (RLS) policies.
-- ==============================================================================

-- Enable foundational cryptographic & UUID extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set default timezone to Indian Standard Time (IST / Asia/Kolkata)
-- L'Asador operates in Mohali, Punjab
ALTER DATABASE postgres SET timezone TO 'Asia/Kolkata';

-- Comment marking initial database foundation readiness
COMMENT ON SCHEMA public IS 'L''Asador – Grill & Brew Dedicated Public Schema';
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
-- ==============================================================================
-- L'ASADOR – GRILL & BREW | INDEPENDENT SUPABASE FOUNDATION
-- Migration: 20261120000002_menu_catalog_and_tables.sql
-- Scope: Menu Catalog, Modifiers, Dining Tables & QR Token Sessions
-- Single Restaurant Architecture (Mohali, Punjab)
-- ==============================================================================

-- 1. Enums for Preparation Stations & Dietary Types
DO $$ BEGIN
  CREATE TYPE item_station AS ENUM (
    'kitchen_grill',
    'kitchen_fry',
    'kitchen_pantry',
    'bar_taps',
    'bar_cocktails'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE dietary_type AS ENUM ('veg', 'non_veg', 'egg', 'vegan');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Menu Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  station item_station NOT NULL DEFAULT 'kitchen_grill',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

DROP TRIGGER IF EXISTS trigger_categories_updated_at ON categories;
CREATE TRIGGER trigger_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- 3. Products Table (Dishes, Cuts, Beers, Cocktails)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  base_price NUMERIC(10, 2) NOT NULL CHECK (base_price >= 0),
  dietary dietary_type NOT NULL DEFAULT 'non_veg',
  station item_station NOT NULL DEFAULT 'kitchen_grill',
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(is_available, display_order);
CREATE INDEX IF NOT EXISTS idx_products_station ON products(station);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

DROP TRIGGER IF EXISTS trigger_products_updated_at ON products;
CREATE TRIGGER trigger_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- 4. Product Images Table
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);

-- 5. Product Variants Table (Sizes, Cuts, Pours)
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  is_available BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, name)
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);

DROP TRIGGER IF EXISTS trigger_product_variants_updated_at ON product_variants;
CREATE TRIGGER trigger_product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- 6. Modifier Groups Table (e.g. Steak Doneness, Sauces, Add-ons)
CREATE TABLE IF NOT EXISTS modifier_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  min_selections INTEGER NOT NULL DEFAULT 0 CHECK (min_selections >= 0),
  max_selections INTEGER NOT NULL DEFAULT 1 CHECK (max_selections >= min_selections),
  is_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trigger_modifier_groups_updated_at ON modifier_groups;
CREATE TRIGGER trigger_modifier_groups_updated_at
  BEFORE UPDATE ON modifier_groups
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- 7. Modifiers Table (e.g. Rare, Medium-Rare, Chimichurri, Garlic Butter)
CREATE TABLE IF NOT EXISTS modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modifier_group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_delta NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (price_delta >= 0),
  is_available BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (modifier_group_id, name)
);

CREATE INDEX IF NOT EXISTS idx_modifiers_group ON modifiers(modifier_group_id);

DROP TRIGGER IF EXISTS trigger_modifiers_updated_at ON modifiers;
CREATE TRIGGER trigger_modifiers_updated_at
  BEFORE UPDATE ON modifiers
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- 8. Product to Modifier Group Association Table
CREATE TABLE IF NOT EXISTS product_modifier_groups (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  modifier_group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, modifier_group_id)
);

CREATE INDEX IF NOT EXISTS idx_pmg_product ON product_modifier_groups(product_id);
CREATE INDEX IF NOT EXISTS idx_pmg_group ON product_modifier_groups(modifier_group_id);

-- 9. Dining Tables Table
CREATE TABLE IF NOT EXISTS dining_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number TEXT NOT NULL UNIQUE,
  label TEXT,
  zone TEXT NOT NULL DEFAULT 'Main Dining',
  capacity INTEGER NOT NULL DEFAULT 4 CHECK (capacity > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dining_tables_number ON dining_tables(table_number);
CREATE INDEX IF NOT EXISTS idx_dining_tables_active ON dining_tables(is_active);

DROP TRIGGER IF EXISTS trigger_dining_tables_updated_at ON dining_tables;
CREATE TRIGGER trigger_dining_tables_updated_at
  BEFORE UPDATE ON dining_tables
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- 10. Table QR Tokens Table (Lifecycle & Revocation, Permanent Validity)
CREATE TABLE IF NOT EXISTS table_qr_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES dining_tables(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  raw_token TEXT,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_table_qr_tokens_hash ON table_qr_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_table_qr_tokens_raw_token ON table_qr_tokens(raw_token) WHERE raw_token IS NOT NULL;
-- Enforce only one active QR token per table at any time
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_qr_token_per_table
  ON table_qr_tokens(table_id)
  WHERE is_active = true;

-- 11. Table Sessions Table (Active Dining Session per Table)
CREATE TABLE IF NOT EXISTS table_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES dining_tables(id) ON DELETE RESTRICT,
  session_token_hash TEXT NOT NULL UNIQUE,
  guest_count INTEGER DEFAULT 1 CHECK (guest_count > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'billing', 'closed')),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_table_sessions_table ON table_sessions(table_id);
CREATE INDEX IF NOT EXISTS idx_table_sessions_status ON table_sessions(status);
CREATE INDEX IF NOT EXISTS idx_table_sessions_token ON table_sessions(session_token_hash);

DROP TRIGGER IF EXISTS trigger_table_sessions_updated_at ON table_sessions;
CREATE TRIGGER trigger_table_sessions_updated_at
  BEFORE UPDATE ON table_sessions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
-- ==============================================================================
-- L'ASADOR – GRILL & BREW | INDEPENDENT SUPABASE FOUNDATION
-- Migration: 20261120000003_orders_and_billing_foundation.sql
-- Scope: Orders, Line Item Snapshots, Billing, Payments & Audit Logs
-- Single Restaurant Architecture (Mohali, Punjab)
-- ==============================================================================

-- 1. Order and Billing Enums
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'new',
    'accepted',
    'preparing',
    'ready',
    'completed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE item_prep_status AS ENUM (
    'pending',
    'preparing',
    'ready',
    'served',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE bill_status AS ENUM (
    'open',
    'requested',
    'settled',
    'voided'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM (
    'cash',
    'upi_qr',
    'card',
    'pos_machine'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'pending',
    'completed',
    'failed',
    'refunded'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  table_id UUID NOT NULL REFERENCES dining_tables(id) ON DELETE RESTRICT,
  session_id UUID NOT NULL REFERENCES table_sessions(id) ON DELETE RESTRICT,
  status order_status NOT NULL DEFAULT 'new',
  idempotency_key TEXT NOT NULL UNIQUE,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
  tax_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (tax_total >= 0),
  service_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (service_charge >= 0),
  discount_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (discount_total >= 0),
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
  special_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_idempotency ON orders(idempotency_key);

DROP TRIGGER IF EXISTS trigger_orders_updated_at ON orders;
CREATE TRIGGER trigger_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- 3. Order Items Table (Frozen Line Items & Prep Station Routing)
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES product_variants(id) ON DELETE RESTRICT,
  product_name_snapshot TEXT NOT NULL,
  variant_name_snapshot TEXT,
  unit_price_snapshot NUMERIC(10, 2) NOT NULL CHECK (unit_price_snapshot >= 0),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
  station item_station NOT NULL DEFAULT 'kitchen_grill',
  prep_status item_prep_status NOT NULL DEFAULT 'pending',
  customer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_station_status ON order_items(station, prep_status);

DROP TRIGGER IF EXISTS trigger_order_items_updated_at ON order_items;
CREATE TRIGGER trigger_order_items_updated_at
  BEFORE UPDATE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- 4. Order Item Modifiers Table (Frozen Option Choices & Price Deltas)
CREATE TABLE IF NOT EXISTS order_item_modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  modifier_id UUID NOT NULL REFERENCES modifiers(id) ON DELETE RESTRICT,
  modifier_name_snapshot TEXT NOT NULL,
  price_delta_snapshot NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_item_modifiers_item ON order_item_modifiers(order_item_id);

-- 5. Bills Table
CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number TEXT NOT NULL UNIQUE,
  session_id UUID NOT NULL REFERENCES table_sessions(id) ON DELETE RESTRICT,
  table_id UUID NOT NULL REFERENCES dining_tables(id) ON DELETE RESTRICT,
  status bill_status NOT NULL DEFAULT 'open',
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
  cgst_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (cgst_amount >= 0),
  sgst_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (sgst_amount >= 0),
  service_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (service_charge >= 0),
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
  final_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (final_total >= 0),
  requested_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  settled_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bills_session ON bills(session_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_table ON bills(table_id);

DROP TRIGGER IF EXISTS trigger_bills_updated_at ON bills;
CREATE TRIGGER trigger_bills_updated_at
  BEFORE UPDATE ON bills
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- 6. Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE RESTRICT,
  payment_method payment_method NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  transaction_reference TEXT,
  collected_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_bill ON payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

DROP TRIGGER IF EXISTS trigger_payments_updated_at ON payments;
CREATE TRIGGER trigger_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- 7. Audit Logs Table (Administrative & Security Event Trail)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
-- ==============================================================================
-- L'ASADOR – GRILL & BREW | INDEPENDENT SUPABASE FOUNDATION
-- Migration: 20261120000004_rls_and_security_policies.sql
-- Scope: Row Level Security (RLS) Policies & Role-Based Access Control (RBAC)
-- Single Restaurant Architecture (Mohali, Punjab)
-- ==============================================================================

-- ==============================================================================
-- 1. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ==============================================================================
ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_modifier_groups ENABLE ROW LEVEL SECURITY;

ALTER TABLE dining_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_qr_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 2. RESTAURANT SETTINGS, BUSINESS HOURS & TAXES
-- ==============================================================================

-- Public can read restaurant settings, operating hours, and tax configurations
CREATE POLICY "Public can view restaurant settings"
  ON restaurant_settings FOR SELECT
  USING (true);

CREATE POLICY "Owner and Admin can update restaurant settings"
  ON restaurant_settings FOR UPDATE
  USING (is_owner_or_admin())
  WITH CHECK (is_owner_or_admin());

CREATE POLICY "Public can view business hours"
  ON business_hours FOR SELECT
  USING (true);

CREATE POLICY "Owner and Admin can manage business hours"
  ON business_hours FOR ALL
  USING (is_owner_or_admin())
  WITH CHECK (is_owner_or_admin());

CREATE POLICY "Public can view tax settings"
  ON tax_settings FOR SELECT
  USING (true);

CREATE POLICY "Owner and Admin can manage tax settings"
  ON tax_settings FOR ALL
  USING (is_owner_or_admin())
  WITH CHECK (is_owner_or_admin());

-- ==============================================================================
-- 3. STAFF ROLES & PERMISSIONS
-- ==============================================================================

CREATE POLICY "Staff can view staff roles"
  ON staff_roles FOR SELECT
  USING (is_staff());

CREATE POLICY "Staff can view staff permissions"
  ON staff_permissions FOR SELECT
  USING (is_staff());

CREATE POLICY "Owner and Admin can manage staff permissions"
  ON staff_permissions FOR ALL
  USING (is_owner_or_admin())
  WITH CHECK (is_owner_or_admin());

-- ==============================================================================
-- 4. PROFILES & ROLE-ESCALATION PREVENTION
-- ==============================================================================

-- Staff can view all active staff profiles
CREATE POLICY "Staff can view active staff profiles"
  ON profiles FOR SELECT
  USING (is_staff());

-- Staff can update their own personal contact info (full_name, phone)
-- CRITICAL SECURITY RULE: The WITH CHECK clause strictly asserts that the user's role
-- cannot be altered during self-updates, preventing privilege escalation.
CREATE POLICY "Staff can update own profile contact info without role escalation"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
  );

-- Owner and Admin can insert, update, or remove staff accounts and assign roles
CREATE POLICY "Owner and Admin can manage all profiles"
  ON profiles FOR ALL
  USING (is_owner_or_admin())
  WITH CHECK (is_owner_or_admin());

-- ==============================================================================
-- 5. MENU CATALOG POLICIES
-- ==============================================================================

-- Categories
CREATE POLICY "Public can view active categories"
  ON categories FOR SELECT
  USING (is_active = true OR is_staff());

CREATE POLICY "Manager and above can manage categories"
  ON categories FOR ALL
  USING (is_manager_or_above())
  WITH CHECK (is_manager_or_above());

-- Products
CREATE POLICY "Public can view available products"
  ON products FOR SELECT
  USING (is_available = true OR is_staff());

CREATE POLICY "Manager and above can manage products"
  ON products FOR ALL
  USING (is_manager_or_above())
  WITH CHECK (is_manager_or_above());

-- Product Images
CREATE POLICY "Public can view product images"
  ON product_images FOR SELECT
  USING (true);

CREATE POLICY "Manager and above can manage product images"
  ON product_images FOR ALL
  USING (is_manager_or_above())
  WITH CHECK (is_manager_or_above());

-- Product Variants
CREATE POLICY "Public can view available variants"
  ON product_variants FOR SELECT
  USING (is_available = true OR is_staff());

CREATE POLICY "Manager and above can manage product variants"
  ON product_variants FOR ALL
  USING (is_manager_or_above())
  WITH CHECK (is_manager_or_above());

-- Modifier Groups
CREATE POLICY "Public can view modifier groups"
  ON modifier_groups FOR SELECT
  USING (true);

CREATE POLICY "Manager and above can manage modifier groups"
  ON modifier_groups FOR ALL
  USING (is_manager_or_above())
  WITH CHECK (is_manager_or_above());

-- Modifiers
CREATE POLICY "Public can view available modifiers"
  ON modifiers FOR SELECT
  USING (is_available = true OR is_staff());

CREATE POLICY "Manager and above can manage modifiers"
  ON modifiers FOR ALL
  USING (is_manager_or_above())
  WITH CHECK (is_manager_or_above());

-- Product Modifier Groups
CREATE POLICY "Public can view product modifier group links"
  ON product_modifier_groups FOR SELECT
  USING (true);

CREATE POLICY "Manager and above can manage product modifier group links"
  ON product_modifier_groups FOR ALL
  USING (is_manager_or_above())
  WITH CHECK (is_manager_or_above());

-- ==============================================================================
-- 6. DINING TABLES, QR TOKENS & SESSIONS
-- ==============================================================================

-- Dining Tables
CREATE POLICY "Public can view active dining tables"
  ON dining_tables FOR SELECT
  USING (is_active = true OR is_staff());

CREATE POLICY "Manager and above can manage dining tables"
  ON dining_tables FOR ALL
  USING (is_manager_or_above())
  WITH CHECK (is_manager_or_above());

-- Table QR Tokens: NO DIRECT PUBLIC READ/WRITE (Resolved via secure server RPC)
CREATE POLICY "Staff can view table QR tokens"
  ON table_qr_tokens FOR SELECT
  USING (is_staff());

CREATE POLICY "Manager and above can manage table QR tokens"
  ON table_qr_tokens FOR ALL
  USING (is_manager_or_above())
  WITH CHECK (is_manager_or_above());

-- Table Sessions
CREATE POLICY "Public can view active table session for current table"
  ON table_sessions FOR SELECT
  USING (status = 'active' OR is_staff());

CREATE POLICY "Staff can view and update table sessions"
  ON table_sessions FOR ALL
  USING (is_staff())
  WITH CHECK (is_staff());

-- ==============================================================================
-- 7. ORDERS & LINE ITEMS
-- ==============================================================================

-- Orders
CREATE POLICY "Staff can view all orders"
  ON orders FOR SELECT
  USING (is_staff());

CREATE POLICY "Staff can update orders"
  ON orders FOR UPDATE
  USING (is_staff())
  WITH CHECK (is_staff());

-- Order Items
CREATE POLICY "Staff can view all order items"
  ON order_items FOR SELECT
  USING (is_staff());

CREATE POLICY "Kitchen staff can update kitchen order item prep status"
  ON order_items FOR UPDATE
  USING (
    get_auth_role() IN ('owner', 'admin', 'manager', 'kitchen')
    AND station IN ('kitchen_grill', 'kitchen_fry', 'kitchen_pantry')
  )
  WITH CHECK (
    get_auth_role() IN ('owner', 'admin', 'manager', 'kitchen')
    AND station IN ('kitchen_grill', 'kitchen_fry', 'kitchen_pantry')
  );

CREATE POLICY "Bar staff can update bar order item prep status"
  ON order_items FOR UPDATE
  USING (
    get_auth_role() IN ('owner', 'admin', 'manager', 'bar')
    AND station IN ('bar_taps', 'bar_cocktails')
  )
  WITH CHECK (
    get_auth_role() IN ('owner', 'admin', 'manager', 'bar')
    AND station IN ('bar_taps', 'bar_cocktails')
  );

-- Order Item Modifiers
CREATE POLICY "Staff can view order item modifiers"
  ON order_item_modifiers FOR SELECT
  USING (is_staff());

-- ==============================================================================
-- 8. BILLS, PAYMENTS & AUDIT LOGS
-- ==============================================================================

-- Bills
CREATE POLICY "Staff can view bills"
  ON bills FOR SELECT
  USING (is_staff());

CREATE POLICY "Manager and above can settle bills"
  ON bills FOR ALL
  USING (is_manager_or_above())
  WITH CHECK (is_manager_or_above());

-- Payments
CREATE POLICY "Staff can view payments"
  ON payments FOR SELECT
  USING (is_staff());

CREATE POLICY "Manager and above can record payments"
  ON payments FOR ALL
  USING (is_manager_or_above())
  WITH CHECK (is_manager_or_above());

-- Audit Logs
CREATE POLICY "Owner and Admin can view audit logs"
  ON audit_logs FOR SELECT
  USING (is_owner_or_admin());

CREATE POLICY "Staff can append audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (is_staff());
-- ==============================================================================
-- L'ASADOR – GRILL & BREW | INDEPENDENT SUPABASE FOUNDATION
-- Migration: 20261120000005_grants_and_rls_recursion_fix.sql
-- Scope: PostgREST Schema Grants & RLS Recursion Prevention
-- Single Restaurant Architecture (Mohali, Punjab)
-- ==============================================================================

-- 1. Grant PostgREST schema and object permissions
-- In Supabase, the API roles (anon, authenticated, service_role) must be granted
-- schema usage and table privileges before PostgREST evaluates RLS policies.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 2. Fix Potential RLS Recursion on profiles
-- The subquery in the self-update policy `(SELECT p.role FROM profiles p WHERE p.id = auth.uid())`
-- queries public.profiles during an UPDATE on public.profiles.
-- To completely eliminate RLS recursion while strictly preserving role security,
-- we define a SECURITY DEFINER function with a pinned search_path.

CREATE OR REPLACE FUNCTION get_profile_role(user_id UUID)
RETURNS staff_role AS $$
  SELECT role FROM public.profiles WHERE id = user_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Revoke public execution and allow authenticated/service_role
REVOKE EXECUTE ON FUNCTION get_profile_role(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_profile_role(UUID) TO authenticated, service_role;

-- Replace the self-update policy with the non-recursive helper
DROP POLICY IF EXISTS "Staff can update own profile contact info without role escalation" ON profiles;

CREATE POLICY "Staff can update own profile contact info without role escalation"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = get_profile_role(auth.uid())
  );
-- ==============================================================================
-- L'ASADOR â€“ GRILL & BREW | INDEPENDENT SUPABASE FOUNDATION
-- Migration: 20261121000006_least_privilege_grants_and_fixes.sql
-- Scope: Least-Privilege Grants (F-01), Split Payments (F-02), Atomic Order RPC (F-03), Currency Precision (F-05)
-- Location: Sector 82, JLPL Industrial Area, Mohali, Punjab (Asia/Kolkata)
-- ==============================================================================

-- 1. BILL STATUS ENUM & BILLS TABLE SCHEMA UPDATES (F-02)
DO $$ BEGIN
  ALTER TYPE bill_status ADD VALUE IF NOT EXISTS 'partially_paid';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE bills
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0),
  ADD COLUMN IF NOT EXISTS balance_remaining NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (balance_remaining >= 0);

-- Safely initialize existing records
UPDATE bills
SET amount_paid = final_total, balance_remaining = 0.00
WHERE status = 'settled' AND amount_paid = 0.00 AND balance_remaining = 0.00;

UPDATE bills
SET amount_paid = 0.00, balance_remaining = final_total
WHERE status IN ('open', 'requested') AND amount_paid = 0.00 AND balance_remaining = 0.00;

-- 2. LEAST-PRIVILEGE POSTGREST GRANTS (F-01)
-- Ensure PostgREST roles can access schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Revoke all table privileges from anon by default
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;

-- Grant least-privilege SELECT access to anon ONLY for customer QR menu browsing
GRANT SELECT ON TABLE
  public.restaurant_settings,
  public.business_hours,
  public.tax_settings,
  public.categories,
  public.products,
  public.product_images,
  public.product_variants,
  public.modifier_groups,
  public.modifiers,
  public.product_modifier_groups,
  public.dining_tables,
  public.table_sessions
TO anon;

-- SENSITIVE TABLES MUST NEVER BE ACCESSIBLE TO anon:
-- profiles, staff_roles, staff_permissions, audit_logs, table_qr_tokens,
-- orders, order_items, order_item_modifiers, bills, payments have NO direct grants to anon.

-- Staff role (authenticated) permissions (Strictly governed by Row Level Security)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Service role (server-side Next.js admin client) has full administrative grants
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

-- 3. RECURSION-FREE ROLE LOOKUP WITH PINNED SEARCH PATH (F-01)
CREATE OR REPLACE FUNCTION public.get_profile_role(user_id UUID)
RETURNS staff_role AS $$
  SELECT role FROM public.profiles WHERE id = user_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.get_profile_role(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_role(UUID) TO authenticated, service_role;

-- Update profiles RLS policy to strictly prevent self-role escalation
DROP POLICY IF EXISTS "Staff can update own profile contact info without role escalation" ON profiles;

CREATE POLICY "Staff can update own profile contact info without role escalation"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = public.get_profile_role(auth.uid())
  );

-- 4. ATOMIC CUSTOMER ORDER CREATION RPC (F-03 & F-05)
-- Performs entire order validation, canonical price calculation, order creation,
-- line items, and modifiers inside a single atomic PostgreSQL transaction.
CREATE OR REPLACE FUNCTION public.create_customer_order(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_table_id UUID;
  v_session_id UUID;
  v_idempotency_key TEXT;
  v_special_instructions TEXT;
  v_items JSONB;

  v_existing_order RECORD;
  v_session_record RECORD;
  v_item RECORD;
  v_mod RECORD;

  v_product RECORD;
  v_variant RECORD;
  v_modifier RECORD;

  v_unit_price NUMERIC(10, 2);
  v_variant_name TEXT;
  v_modifier_total NUMERIC(10, 2);
  v_item_subtotal NUMERIC(10, 2);

  v_calculated_subtotal NUMERIC(10, 2) := 0.00;
  v_cgst NUMERIC(10, 2);
  v_sgst NUMERIC(10, 2);
  v_tax_total NUMERIC(10, 2);
  v_final_total NUMERIC(10, 2);

  v_today_str TEXT;
  v_random_suffix INT;
  v_order_number TEXT;
  v_new_order_id UUID;
  v_new_item_id UUID;

  v_inserted_items_count INT := 0;
BEGIN
  -- 1. Extract payload fields
  v_table_id := (payload->>'tableId')::UUID;
  v_session_id := (payload->>'sessionId')::UUID;
  v_idempotency_key := TRIM(payload->>'idempotencyKey');
  v_special_instructions := NULLIF(TRIM(payload->>'specialInstructions'), '');
  v_items := payload->'items';

  IF v_table_id IS NULL OR v_session_id IS NULL OR v_idempotency_key IS NULL OR v_items IS NULL THEN
    RAISE EXCEPTION 'Invalid order payload: tableId, sessionId, idempotencyKey and items are required.';
  END IF;

  IF jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item.';
  END IF;

  -- 2. Check Idempotency: Return existing order if key was already submitted
  SELECT id, order_number INTO v_existing_order
  FROM public.orders
  WHERE idempotency_key = v_idempotency_key
  LIMIT 1;

  IF v_existing_order.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'order_id', v_existing_order.id,
      'order_number', v_existing_order.order_number,
      'is_duplicate', true
    );
  END IF;

  -- 3. Verify Table Session is Active
  SELECT id, status INTO v_session_record
  FROM public.table_sessions
  WHERE id = v_session_id AND table_id = v_table_id AND status = 'active'
  LIMIT 1;

  IF v_session_record.id IS NULL THEN
    RAISE EXCEPTION 'Dining session is inactive, expired, or invalid for this table.';
  END IF;

  -- 4. Calculate Subtotals and Validate All Items Server-Side
  FOR v_item IN SELECT * FROM jsonb_to_recordset(v_items) AS (
    "productId" UUID,
    "variantId" UUID,
    "quantity" INT,
    "customerNotes" TEXT,
    "selectedModifierIds" UUID[]
  )
  LOOP
    IF v_item."quantity" IS NULL OR v_item."quantity" <= 0 THEN
      RAISE EXCEPTION 'Item quantity must be a positive integer.';
    END IF;

    -- Fetch Product
    SELECT id, name, base_price, prep_station, is_available, is_active
    INTO v_product
    FROM public.products
    WHERE id = v_item."productId"
    LIMIT 1;

    IF v_product.id IS NULL OR NOT v_product.is_active OR NOT v_product.is_available THEN
      RAISE EXCEPTION 'Product "%" is currently unavailable or inactive.', COALESCE(v_product.name, 'Selected item');
    END IF;

    v_unit_price := v_product.base_price;
    v_variant_name := NULL;

    -- Fetch Variant if specified
    IF v_item."variantId" IS NOT NULL THEN
      SELECT id, name, price, is_available
      INTO v_variant
      FROM public.product_variants
      WHERE id = v_item."variantId" AND product_id = v_product.id
      LIMIT 1;

      IF v_variant.id IS NULL OR NOT v_variant.is_available THEN
        RAISE EXCEPTION 'Portion variant for "%" is currently unavailable.', v_product.name;
      END IF;

      v_unit_price := v_variant.price;
      v_variant_name := v_variant.name;
    END IF;

    -- Calculate Modifiers
    v_modifier_total := 0.00;
    IF v_item."selectedModifierIds" IS NOT NULL AND array_length(v_item."selectedModifierIds", 1) > 0 THEN
      FOR v_mod IN
        SELECT id, name, price_delta, is_available
        FROM public.modifiers
        WHERE id = ANY(v_item."selectedModifierIds")
      LOOP
        IF NOT v_mod.is_available THEN
          RAISE EXCEPTION 'Modifier "%" is currently unavailable.', v_mod.name;
        END IF;
        v_modifier_total := v_modifier_total + v_mod.price_delta;
      END LOOP;
    END IF;

    v_item_subtotal := ROUND(((v_unit_price + v_modifier_total) * v_item."quantity")::numeric, 2);
    v_calculated_subtotal := v_calculated_subtotal + v_item_subtotal;
  END LOOP;

  -- 5. Compute Statutory 5% Indian GST (2.5% CGST + 2.5% SGST)
  v_cgst := ROUND((v_calculated_subtotal * 0.025)::numeric, 2);
  v_sgst := ROUND((v_calculated_subtotal * 0.025)::numeric, 2);
  v_tax_total := v_cgst + v_sgst;
  v_final_total := ROUND((v_calculated_subtotal + v_tax_total)::numeric, 2);

  -- 6. Generate Unique Order Number
  v_today_str := to_char(now() AT TIME ZONE 'Asia/Kolkata', 'YYMMDD');
  v_random_suffix := floor(1000 + random() * 9000)::int;
  v_order_number := 'ORD-' || v_today_str || '-' || v_random_suffix;

  -- 7. Insert Order Master Record
  INSERT INTO public.orders (
    order_number,
    table_id,
    session_id,
    status,
    idempotency_key,
    subtotal,
    tax_total,
    service_charge,
    discount_total,
    total_amount,
    special_notes
  ) VALUES (
    v_order_number,
    v_table_id,
    v_session_id,
    'new',
    v_idempotency_key,
    v_calculated_subtotal,
    v_tax_total,
    0.00,
    0.00,
    v_final_total,
    v_special_instructions
  ) RETURNING id INTO v_new_order_id;

  -- 8. Insert Order Items & Item Modifiers
  FOR v_item IN SELECT * FROM jsonb_to_recordset(v_items) AS (
    "productId" UUID,
    "variantId" UUID,
    "quantity" INT,
    "customerNotes" TEXT,
    "selectedModifierIds" UUID[]
  )
  LOOP
    SELECT id, name, base_price, prep_station
    INTO v_product
    FROM public.products
    WHERE id = v_item."productId" LIMIT 1;

    v_unit_price := v_product.base_price;
    v_variant_name := NULL;

    IF v_item."variantId" IS NOT NULL THEN
      SELECT name, price INTO v_variant
      FROM public.product_variants
      WHERE id = v_item."variantId" LIMIT 1;
      v_unit_price := v_variant.price;
      v_variant_name := v_variant.name;
    END IF;

    v_modifier_total := 0.00;
    IF v_item."selectedModifierIds" IS NOT NULL AND array_length(v_item."selectedModifierIds", 1) > 0 THEN
      SELECT COALESCE(SUM(price_delta), 0.00) INTO v_modifier_total
      FROM public.modifiers
      WHERE id = ANY(v_item."selectedModifierIds");
    END IF;

    v_item_subtotal := ROUND(((v_unit_price + v_modifier_total) * v_item."quantity")::numeric, 2);

    INSERT INTO public.order_items (
      order_id,
      product_id,
      variant_id,
      product_name_snapshot,
      variant_name_snapshot,
      unit_price_snapshot,
      quantity,
      subtotal,
      station,
      prep_status,
      customer_notes
    ) VALUES (
      v_new_order_id,
      v_product.id,
      v_item."variantId",
      v_product.name,
      v_variant_name,
      v_unit_price,
      v_item."quantity",
      v_item_subtotal,
      v_product.prep_station,
      'pending',
      v_item."customerNotes"
    ) RETURNING id INTO v_new_item_id;

    v_inserted_items_count := v_inserted_items_count + 1;

    -- Insert snapshot modifiers
    IF v_item."selectedModifierIds" IS NOT NULL AND array_length(v_item."selectedModifierIds", 1) > 0 THEN
      INSERT INTO public.order_item_modifiers (
        order_item_id,
        modifier_id,
        modifier_name_snapshot,
        price_delta_snapshot
      )
      SELECT
        v_new_item_id,
        m.id,
        m.name,
        m.price_delta
      FROM public.modifiers m
      WHERE m.id = ANY(v_item."selectedModifierIds");
    END IF;
  END LOOP;

  -- Return Success Result
  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_new_order_id,
    'order_number', v_order_number,
    'subtotal', v_calculated_subtotal,
    'tax_total', v_tax_total,
    'total_amount', v_final_total,
    'items_count', v_inserted_items_count
  );
END;
$$;

-- Allow anon, authenticated, and service_role to call the atomic order function
REVOKE EXECUTE ON FUNCTION public.create_customer_order(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_customer_order(JSONB) TO anon, authenticated, service_role;

-- 5. ATOMIC BILL PAYMENT & SPLIT SETTLEMENT RPC (F-02 & F-05)
-- Enforces row-level locking (FOR UPDATE) to prevent concurrent payment race conditions.
-- Supports split payments across multiple tenders (Cash, UPI, Card, POS).
-- Prevents overpayment and closes session/releases table ONLY when balance reaches zero.
CREATE OR REPLACE FUNCTION public.record_bill_payment_atomic(
  p_bill_id UUID,
  p_payment_method payment_method,
  p_amount NUMERIC(10, 2),
  p_transaction_ref TEXT,
  p_collected_by UUID,
  p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bill RECORD;
  v_new_amount_paid NUMERIC(10, 2);
  v_new_balance NUMERIC(10, 2);
  v_is_fully_settled BOOLEAN;
  v_new_status bill_status;
  v_payment_id UUID;
BEGIN
  IF p_bill_id IS NULL THEN
    RAISE EXCEPTION 'Missing target bill ID.';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0.00 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero.';
  END IF;

  -- 1. Row Lock Target Bill to Prevent Concurrent Payment Races
  SELECT id, bill_number, session_id, table_id, status, final_total, amount_paid, balance_remaining
  INTO v_bill
  FROM public.bills
  WHERE id = p_bill_id
  FOR UPDATE;

  IF v_bill.id IS NULL THEN
    RAISE EXCEPTION 'Bill record not found.';
  END IF;

  IF v_bill.status = 'settled' OR v_bill.balance_remaining <= 0.00 THEN
    RAISE EXCEPTION 'Bill "%" is already fully settled.', v_bill.bill_number;
  END IF;

  IF v_bill.status = 'voided' THEN
    RAISE EXCEPTION 'Cannot record payment on a voided bill.';
  END IF;

  -- 2. Validate Overpayment
  IF p_amount > v_bill.balance_remaining THEN
    RAISE EXCEPTION 'Overpayment rejected: payment of â‚¹% exceeds outstanding balance of â‚¹%.',
      p_amount, v_bill.balance_remaining;
  END IF;

  -- 3. Calculate New Balances
  v_new_amount_paid := ROUND((v_bill.amount_paid + p_amount)::numeric, 2);
  v_new_balance := ROUND((v_bill.final_total - v_new_amount_paid)::numeric, 2);
  v_is_fully_settled := (v_new_balance <= 0.00);

  IF v_is_fully_settled THEN
    v_new_status := 'settled'::bill_status;
  ELSE
    v_new_status := 'partially_paid'::bill_status;
  END IF;

  -- 4. Insert Payment Record
  INSERT INTO public.payments (
    bill_id,
    payment_method,
    status,
    amount,
    transaction_reference,
    collected_by,
    notes
  ) VALUES (
    p_bill_id,
    p_payment_method,
    'completed',
    p_amount,
    p_transaction_ref,
    p_collected_by,
    p_notes
  ) RETURNING id INTO v_payment_id;

  -- 5. Update Bill Master Record
  UPDATE public.bills
  SET
    amount_paid = v_new_amount_paid,
    balance_remaining = v_new_balance,
    status = v_new_status,
    settled_at = CASE WHEN v_is_fully_settled THEN now() ELSE settled_at END,
    settled_by = CASE WHEN v_is_fully_settled THEN p_collected_by ELSE settled_by END,
    updated_at = now()
  WHERE id = p_bill_id;

  -- 6. Close Table Session and Release Table ONLY IF Fully Settled
  IF v_is_fully_settled AND v_bill.session_id IS NOT NULL THEN
    UPDATE public.table_sessions
    SET
      status = 'closed',
      closed_at = now(),
      updated_at = now()
    WHERE id = v_bill.session_id;
  END IF;

  -- 7. Return Result JSONB
  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'bill_number', v_bill.bill_number,
    'amount_paid', v_new_amount_paid,
    'balance_remaining', v_new_balance,
    'is_settled', v_is_fully_settled,
    'status', v_new_status
  );
END;
$$;

-- Allow only authenticated staff and service_role to execute bill settlements
REVOKE EXECUTE ON FUNCTION public.record_bill_payment_atomic(UUID, payment_method, NUMERIC, TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_bill_payment_atomic(UUID, payment_method, NUMERIC, TEXT, UUID, TEXT) TO authenticated, service_role;
