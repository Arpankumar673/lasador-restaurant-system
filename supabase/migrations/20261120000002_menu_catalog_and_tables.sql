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

-- 10. Table QR Tokens Table (Lifecycle & Revocation, Hashed Secrets)
CREATE TABLE IF NOT EXISTS table_qr_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES dining_tables(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_table_qr_tokens_hash ON table_qr_tokens(token_hash);
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
