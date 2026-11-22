# L'Asador – Grill & Brew | Database Setup Guide
**Location:** Sector 82, JLPL Industrial Area, Mohali, Punjab, India  
**Document Version:** 2.0.0 (Phase 2 Foundation)  

---

## 1. Prerequisites

1. Dedicated Supabase project provisioned in `ap-south-1` (Mumbai, India).
2. Environment configuration verified in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Node.js `v18+` or `v24+` installed locally.

---

## 2. Applying Database Migrations

You can apply the migrations using either the Supabase Dashboard SQL Editor (recommended for rapid setup) or the Supabase CLI.

### Option A: Via Supabase Dashboard (Recommended)

1. Open your dedicated Supabase project dashboard: [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Navigate to the **SQL Editor** tab on the left sidebar.
3. Click **New Query**.
4. Open the consolidated schema file in this repository:
   - [`supabase/full_schema.sql`](file:///c:/Projects/LAsador-Restaurant-System/supabase/full_schema.sql)
5. Copy the entire contents of `supabase/full_schema.sql` and paste it into the SQL Editor.
6. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`).
7. Verify the output reports `Success. No rows returned`.

### Option B: Sequential Migration Execution

If you prefer applying each migration individually in order:

1. `supabase/migrations/20261119000000_phase1_initial_setup.sql`: Cryptographic extensions (`uuid-ossp`, `pgcrypto`) and `Asia/Kolkata` timezone.
2. `supabase/migrations/20261120000001_restaurant_and_staff.sql`: Roles, permissions, profiles, restaurant settings, business hours, and taxes.
3. `supabase/migrations/20261120000002_menu_catalog_and_tables.sql`: Categories, products, variants, modifiers, dining tables, and QR tokens.
4. `supabase/migrations/20261120000003_orders_and_billing_foundation.sql`: Orders, frozen line items, bills, payments, and audit logs.
5. `supabase/migrations/20261120000004_rls_and_security_policies.sql`: Row Level Security policies on all 22 tables.

---

## 3. Applying Initial Sample Seed Data

Once the schema migrations have succeeded:

1. In the Supabase **SQL Editor**, open a new query.
2. Open [`supabase/seed.sql`](file:///c:/Projects/LAsador-Restaurant-System/supabase/seed.sql).
3. Paste the contents and click **Run**.
4. This seeds:
   - Sample restaurant settings for L'Asador (Mohali, Punjab).
   - Weekly operating schedule (12:00 PM – 11:30 PM weekdays, 12:30 AM weekends).
   - Statutory tax placeholders (CGST 2.5%, SGST 2.5%, Service Charge 5.0%).
   - Sample menu categories (Wood-Fired Hearth, Craft Taps, Charcoal Tapas, Cold Pantry).
   - Sample products with cuts and pour variants.
   - Sample dining tables (T-01 through T-03, BAR-01, BAR-02, PATIO-01) with hashed QR tokens.

---

## 4. Provisioning the First Owner / Admin Account

To provision the first administrative user:

1. In the Supabase Dashboard, go to **Authentication -> Users**.
2. Click **Add User -> Create User**.
3. Enter the owner's email address (e.g., `admin@lasador.in`) and a secure password.
4. Click **Create User** and copy the generated user **UUID** (`User UID`).
5. Open the **SQL Editor** and execute the following query to link the authentication user to the `owner` staff profile:

```sql
INSERT INTO profiles (id, email, full_name, role, is_active)
VALUES (
  '<PASTE_USER_UID_HERE>',
  'admin@lasador.in',
  'Restaurant Owner',
  'owner',
  true
)
ON CONFLICT (id) DO UPDATE SET
  role = 'owner',
  is_active = true;
```

6. The owner can now sign in and manage the restaurant via the admin console in Phase 3.

---

## 5. Verification & Testing

Run the automated verification suite to validate the connection and security rules:

```bash
# Run security and schema integrity tests
npm test

# Verify TypeScript compilation against database types
npm run type-check

# Verify ESLint rules
npm run lint

# Verify production build
npm run build
```

---

## 6. Troubleshooting Common Issues

### Schema Cache Notice (`PGRST205`)
If PostgREST returns `PGRST205: Could not find the table in the schema cache` immediately after running migrations:
- PostgREST reloads its schema cache within a few seconds.
- You can manually trigger an immediate reload in SQL Editor:
  ```sql
  NOTIFY pgrst, 'reload schema';
  ```
