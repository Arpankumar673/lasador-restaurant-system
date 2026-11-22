-- ==============================================================================
-- L'ASADOR – GRILL & BREW | INITIAL SAMPLE SEED DATA
-- Scope: Development & Initial Testing Placeholders (Mohali, Punjab)
-- WARNING: All records in this file are clearly marked SAMPLE/PLACEHOLDER data.
-- NEVER SEED REAL PASSWORDS OR PRODUCTION STAFF ACCOUNTS IN THIS FILE.
-- ==============================================================================

-- 1. Singleton Restaurant Settings (Sample Placeholder)
INSERT INTO restaurant_settings (
  id,
  name,
  tagline,
  description,
  address_line1,
  address_line2,
  city,
  state,
  pincode,
  country,
  phone,
  email,
  gst_number,
  fssai_license,
  currency,
  currency_symbol,
  timezone,
  is_ordering_enabled
) VALUES (
  1,
  'L''Asador – Grill & Brew',
  'Artisanal Wood-Fired Grill & Craft Microbrewery [SAMPLE]',
  'A sample culinary destination in Mohali featuring wood-fired grill dishes and in-house microbrewery drafts. [SAMPLE DATA FOR TESTING]',
  'Sector 82, JLPL Industrial Area',
  'Sample Floor Suite 101',
  'Mohali',
  'Punjab',
  '140308',
  'India',
  '+91 98765 43210',
  'sample.reservations@lasador.in',
  '03AAAAA0000A1Z5 [SAMPLE]',
  '10020000000000 [SAMPLE]',
  'INR',
  '₹',
  'Asia/Kolkata',
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description;

-- 2. Operating Business Hours (Sample Weekly Schedule)
INSERT INTO business_hours (day_of_week, day_name, open_time, close_time, is_closed) VALUES
  (0, 'Sunday', '12:00:00', '23:30:00', false),
  (1, 'Monday', '12:00:00', '23:30:00', false),
  (2, 'Tuesday', '12:00:00', '23:30:00', false),
  (3, 'Wednesday', '12:00:00', '23:30:00', false),
  (4, 'Thursday', '12:00:00', '23:30:00', false),
  (5, 'Friday', '12:00:00', '00:30:00', false),
  (6, 'Saturday', '12:00:00', '00:30:00', false)
ON CONFLICT (day_of_week) DO NOTHING;

-- 3. Tax Settings (Sample Statutory Placeholders)
INSERT INTO tax_settings (name, code, rate_percentage, is_active, is_mandatory, is_inclusive, display_order) VALUES
  ('Central GST (CGST) [SAMPLE]', 'cgst', 2.50, true, true, false, 1),
  ('State GST (SGST) [SAMPLE]', 'sgst', 2.50, true, true, false, 2),
  ('Staff Service Charge [SAMPLE]', 'service_charge', 5.00, true, false, false, 3)
ON CONFLICT (code) DO NOTHING;

-- 4. Sample Menu Categories
INSERT INTO categories (id, name, slug, description, station, display_order, is_active) VALUES
  ('11111111-1111-4111-8111-111111111101', 'Wood-Fired Hearth [SAMPLE]', 'wood-fired-hearth', 'Prime dry-aged steaks and cuts seared over hardwood embers', 'kitchen_grill', 1, true),
  ('11111111-1111-4111-8111-111111111102', 'Craft Taps & Drafts [SAMPLE]', 'craft-taps', 'Fresh unfiltered microbrewery beers tapped from cold keg lines', 'bar_taps', 2, true),
  ('11111111-1111-4111-8111-111111111103', 'Charcoal Tapas & Starters [SAMPLE]', 'tapas-starters', 'Fire-roasted small plates and artisanal appetizers', 'kitchen_fry', 3, true),
  ('11111111-1111-4111-8111-111111111104', 'Cold Hearth & Pantry [SAMPLE]', 'cold-pantry', 'Smoked burrata, charcuterie, artisan bread and desserts', 'kitchen_pantry', 4, true),
  ('11111111-1111-4111-8111-111111111105', 'Smoked Cocktails [SAMPLE]', 'smoked-cocktails', 'Handcrafted mixology infused with wood-chip smoke', 'bar_cocktails', 5, true)
ON CONFLICT (slug) DO NOTHING;

-- 5. Sample Products
INSERT INTO products (
  id,
  category_id,
  name,
  slug,
  description,
  base_price,
  dietary,
  station,
  is_available,
  is_featured,
  display_order
) VALUES
  (
    '22222222-2222-4222-8222-222222222201',
    '11111111-1111-4111-8111-111111111101',
    'Wood-Fired Ribeye Cut [SAMPLE]',
    'wood-fired-ribeye-cut',
    'Hickory wood smoked ribeye steak with coarse sea salt and herb bone marrow butter [SAMPLE]',
    1250.00,
    'non_veg',
    'kitchen_grill',
    true,
    true,
    1
  ),
  (
    '22222222-2222-4222-8222-222222222202',
    '11111111-1111-4111-8111-111111111102',
    'Asador Smoked Porter [SAMPLE]',
    'asador-smoked-porter',
    'German beechwood smoked malts with notes of roasted cacao and espresso [SAMPLE]',
    380.00,
    'vegan',
    'bar_taps',
    true,
    true,
    1
  ),
  (
    '22222222-2222-4222-8222-222222222203',
    '11111111-1111-4111-8111-111111111102',
    'Mohali Sunset Witbier [SAMPLE]',
    'mohali-sunset-witbier',
    'Unfiltered Belgian wheat beer brewed with organic sweet orange peel and crushed coriander [SAMPLE]',
    350.00,
    'vegan',
    'bar_taps',
    true,
    false,
    2
  ),
  (
    '22222222-2222-4222-8222-222222222204',
    '11111111-1111-4111-8111-111111111104',
    'Smoked Burrata & Charred Peaches [SAMPLE]',
    'smoked-burrata-peaches',
    'Artisanal burrata with flame-charred fruit, wild arugula, pine nuts, and aged balsamic [SAMPLE]',
    550.00,
    'veg',
    'kitchen_pantry',
    true,
    true,
    1
  )
ON CONFLICT (slug) DO NOTHING;

-- 6. Sample Product Variants
INSERT INTO product_variants (id, product_id, name, sku, price, is_available, display_order) VALUES
  ('33333333-3333-4333-8333-333333333301', '22222222-2222-4222-8222-222222222201', '350g Cut [SAMPLE]', 'STEAK-350G', 1250.00, true, 1),
  ('33333333-3333-4333-8333-333333333302', '22222222-2222-4222-8222-222222222201', '500g Cut [SAMPLE]', 'STEAK-500G', 1750.00, true, 2),
  ('33333333-3333-4333-8333-333333333303', '22222222-2222-4222-8222-222222222202', 'Pint (500ml) [SAMPLE]', 'BEER-PINT-500', 380.00, true, 1),
  ('33333333-3333-4333-8333-333333333304', '22222222-2222-4222-8222-222222222202', 'Pitcher (1500ml) [SAMPLE]', 'BEER-PITCHER-1500', 980.00, true, 2)
ON CONFLICT (product_id, name) DO NOTHING;

-- 7. Sample Modifier Groups & Modifiers
INSERT INTO modifier_groups (id, name, description, min_selections, max_selections, is_required) VALUES
  ('44444444-4444-4444-8444-444444444401', 'Meat Doneness [SAMPLE]', 'Select your preferred grilling doneness level', 1, 1, true),
  ('44444444-4444-4444-8444-444444444402', 'Artisanal Hearth Sauce [SAMPLE]', 'Choose a complimentary wood-fired sauce', 0, 2, false)
ON CONFLICT DO NOTHING;

INSERT INTO modifiers (id, modifier_group_id, name, price_delta, is_available, display_order) VALUES
  ('55555555-5555-4555-8555-555555555501', '44444444-4444-4444-8444-444444444401', 'Medium Rare [SAMPLE]', 0.00, true, 1),
  ('55555555-5555-4555-8555-555555555502', '44444444-4444-4444-8444-444444444401', 'Medium [SAMPLE]', 0.00, true, 2),
  ('55555555-5555-4555-8555-555555555503', '44444444-4444-4444-8444-444444444402', 'Chimichurri Tradicional [SAMPLE]', 0.00, true, 1),
  ('55555555-5555-4555-8555-555555555504', '44444444-4444-4444-8444-444444444402', 'Smoked Bone Marrow Butter [SAMPLE]', 80.00, true, 2)
ON CONFLICT (modifier_group_id, name) DO NOTHING;

INSERT INTO product_modifier_groups (product_id, modifier_group_id, display_order) VALUES
  ('22222222-2222-4222-8222-222222222201', '44444444-4444-4444-8444-444444444401', 1),
  ('22222222-2222-4222-8222-222222222201', '44444444-4444-4444-8444-444444444402', 2)
ON CONFLICT DO NOTHING;

-- 8. Sample Dining Tables
INSERT INTO dining_tables (id, table_number, label, zone, capacity, is_active) VALUES
  ('66666666-6666-4666-8666-666666666601', 'T-01', 'Hearth Table 1 [SAMPLE]', 'Main Hearth Dining', 4, true),
  ('66666666-6666-4666-8666-666666666602', 'T-02', 'Hearth Table 2 [SAMPLE]', 'Main Hearth Dining', 4, true),
  ('66666666-6666-4666-8666-666666666603', 'T-03', 'Hearth Booth 3 [SAMPLE]', 'Main Hearth Dining', 6, true),
  ('66666666-6666-4666-8666-666666666604', 'BAR-01', 'Brew Deck High Top 1 [SAMPLE]', 'Brew Deck & Bar', 2, true),
  ('66666666-6666-4666-8666-666666666605', 'BAR-02', 'Brew Deck High Top 2 [SAMPLE]', 'Brew Deck & Bar', 2, true),
  ('66666666-6666-4666-8666-666666666606', 'PATIO-01', 'Courtyard Garden Table 1 [SAMPLE]', 'Courtyard Garden', 6, true)
ON CONFLICT (table_number) DO NOTHING;

-- 9. Sample Table QR Tokens (SHA-256 Hashed Secrets, Never Plaintext)
INSERT INTO table_qr_tokens (id, table_id, token_hash, is_active) VALUES
  ('77777777-7777-4777-8777-777777777701', '66666666-6666-4666-8666-666666666601', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', true),
  ('77777777-7777-4777-8777-777777777702', '66666666-6666-4666-8666-666666666602', 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb', true),
  ('77777777-7777-4777-8777-777777777703', '66666666-6666-4666-8666-666666666603', '4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce', true),
  ('77777777-7777-4777-8777-777777777704', '66666666-6666-4666-8666-666666666604', '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a', true),
  ('77777777-7777-4777-8777-777777777705', '66666666-6666-4666-8666-666666666605', 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d', true),
  ('77777777-7777-4777-8777-777777777706', '66666666-6666-4666-8666-666666666606', 'e7f6c011776e8db7cd330b54174fd76f7d0216b612387a5ffcfb81e6f0919683', true)
ON CONFLICT (token_hash) DO NOTHING;
