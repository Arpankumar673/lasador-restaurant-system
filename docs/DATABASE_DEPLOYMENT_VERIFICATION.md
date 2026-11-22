# L'Asador – Grill & Brew | Database Deployment & Schema Verification

**Target Instance**: `https://kmcranqbpmddvavoxhuj.supabase.co`  
**Database**: PostgreSQL 15 (Supabase Managed Cloud)  
**Location / Timezone**: Mohali, Punjab (`Asia/Kolkata` / IST)  
**Auditor**: Principal Database Architect & Security Auditor  
**Audit Date**: November 21, 2026  

---

## 1. Executive Summary

This report delivers the results of an empirical database audit performed against the dedicated L'Asador Supabase project.

The investigation compared the codebase SQL migration definitions against the live cloud PostgreSQL instance using direct `@supabase/supabase-js` API probes under both `service_role` and unauthenticated `anon` credentials.

### Primary Audit Findings:
1. **Schema Existence**: Confirmed. Database tables exist in the live PostgreSQL instance.
2. **Auth Integration**: Confirmed. Supabase Auth has 1 registered user (`arpan112230@gmail.com`, UID `a3c740bf-7cda-43ec-adf2-d7bdc6a74941`).
3. **CRITICAL Blocker (Status 403 / Error 42501)**: Live API probes to all tables returned `42501: permission denied for table <table_name>`. PostgREST schema privileges (`GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role`) from Migration 5 have NOT yet been applied in the SQL editor.
4. **Foreign Key & Constraint Architecture**: Schema migrations define 18 strict foreign keys with cascading and restriction rules preserving historical order and billing integrity.

---

## 2. Live Supabase Inspection Results

### 2.1 API Probes Execution Log
During live diagnostic queries from `test/check-perms.mjs`:
```text
Table restaurant_settings (service_role): status = 403, error = 42501: permission denied for table restaurant_settings
Table restaurant_settings (anon):         status = 401, error = 42501: permission denied for table restaurant_settings
Table profiles (service_role):            status = 403, error = 42501: permission denied for table profiles
Table profiles (anon):                    status = 401, error = 42501: permission denied for table profiles
Table categories (service_role):          status = 403, error = 42501: permission denied for table categories
Table products (service_role):            status = 403, error = 42501: permission denied for table products
Table dining_tables (service_role):       status = 403, error = 42501: permission denied for table dining_tables
```

### 2.2 Root Cause Analysis of Error 42501
- **Error Code 42501** represents PostgreSQL `insufficient_privilege`.
- In Supabase, PostgREST connects via the `authenticator` role and switches to `service_role`, `authenticated`, or `anon`.
- When tables are authored by the `postgres` user in the SQL Editor, table permissions default strictly to the owner (`postgres`).
- Without explicit PostgreSQL `GRANT` statements, PostgREST is denied access to read or write rows **before Row Level Security (RLS) is even evaluated**.
- **Conclusion**: The codebase contains the fix in `supabase/migrations/20261120000005_grants_and_rls_recursion_fix.sql`, but this migration script has not yet been executed in the live Supabase SQL editor.

---

## 3. Mandatory One-Time SQL Fix for Production Readiness

To immediately resolve Error 42501 and link the existing owner account, run the following SQL block in the **Supabase SQL Editor**:

```sql
-- ==============================================================================
-- L'ASADOR | PRODUCTION POSTGREST PERMISSIONS & OWNER ACTIVATION
-- Run this block in the Supabase SQL Editor (https://supabase.com/dashboard/project/kmcranqbpmddvavoxhuj/sql)
-- ==============================================================================

-- 1. Grant PostgREST schema and object permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 2. Non-Recursive Role Lookup Function
CREATE OR REPLACE FUNCTION get_profile_role(user_id UUID)
RETURNS staff_role AS $$
  SELECT role FROM public.profiles WHERE id = user_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

REVOKE EXECUTE ON FUNCTION get_profile_role(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_profile_role(UUID) TO authenticated, service_role;

-- 3. Replace Profile Update Policy
DROP POLICY IF EXISTS "Staff can update own profile contact info without role escalation" ON profiles;

CREATE POLICY "Staff can update own profile contact info without role escalation"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = get_profile_role(auth.uid())
  );

-- 4. Activate Registered Owner Profile (Fixing NOT NULL on email)
INSERT INTO public.profiles (id, email, full_name, role, is_active)
SELECT id, email, 'General Manager', 'owner', true
FROM auth.users
WHERE id = 'a3c740bf-7cda-43ec-adf2-d7bdc6a74941'
ON CONFLICT (id) DO UPDATE SET role = 'owner', is_active = true;
```

---

## 4. Foreign Key & Constraint Architecture Verification

The database schema architecture was audited across all relational entities:

### 4.1 Referential Integrity
- `profiles -> auth.users(id)`: `ON DELETE CASCADE`. Removing an auth user safely purges their profile.
- `products -> categories(id)`: `ON DELETE RESTRICT`. Prevents deleting a category while products are assigned to it.
- `order_items -> products(id)`: `ON DELETE RESTRICT`. Prevents hard-deleting a product that exists on past customer orders, safeguarding financial audit trails.
- `order_items -> orders(id)`: `ON DELETE CASCADE`. Clean parent-child deletion during draft or testing stages.
- `payments -> bills(id)`: `ON DELETE RESTRICT`. A bill with financial settlements cannot be deleted.
- `audit_logs -> profiles(id)`: `ON DELETE SET NULL`. Audit logs remain permanently preserved even if staff profiles are deleted.

### 4.2 Check Constraints & Data Integrity
- `restaurant_settings.id = 1`: Singleton table constraint. Prevents creating multiple restaurant configurations in a single-restaurant architecture.
- `dining_tables.capacity > 0`: Positive seating capacity constraint.
- `bills.final_total >= 0`: Non-negative invoice constraint.
- `table_sessions.guest_count > 0`: Positive guest count constraint.

---

## 5. Transaction Boundary & Concurrency Audit

### High Severity Finding: Sequential Non-Atomic Order Placement
- In `src/features/orders/actions.ts` (`submitCustomerOrder`), order submission performs sequential Supabase REST calls:
  1. `supabase.from("orders").insert(...)`
  2. In a loop: `supabase.from("order_items").insert(...)`
  3. In a loop: `supabase.from("order_item_modifiers").insert(...)`
- **Risk**: If the network connection drops or a modifier constraint fails midway through the loop, the parent order remains inserted in `orders`, but has missing line items.
- **Remediation**: In a subsequent release, encapsulate order creation inside a PostgreSQL function `CREATE OR REPLACE FUNCTION place_customer_order(...)` called via `supabase.rpc()`.
