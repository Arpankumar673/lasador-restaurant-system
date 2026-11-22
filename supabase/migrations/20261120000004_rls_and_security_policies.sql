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
