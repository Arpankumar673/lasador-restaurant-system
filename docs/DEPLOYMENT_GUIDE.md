# L'Asador – Grill & Brew | Production Deployment Guide

## 1. Overview
This guide provides step-by-step instructions for deploying **L'Asador – Grill & Brew**, Sector 82, JLPL Industrial Area, Mohali, Punjab to production infrastructure.

The platform consists of:
1. **Frontend / Application Server**: Next.js 14 App Router (Node.js runtime or Vercel).
2. **Database & Authentication**: Dedicated Supabase PostgreSQL project with Row Level Security.
3. **PWA Client**: Progressive Web Application with offline static caching.

---

## 2. Prerequisites
- Node.js `20.x` or `22.x` LTS.
- npm `10.x` or higher.
- A dedicated Supabase project (already created: `https://kmcranqbpmddvavoxhuj.supabase.co`).
- A production hosting platform (Vercel, AWS ECS, Google Cloud Run, or Ubuntu VPS).

---

## 3. Environment Variables Configuration

Configure the following environment variables in your deployment environment:

```ini
# L'Asador Production Environment Variables

# Public Supabase URL & Anon Key (Client-Safe)
NEXT_PUBLIC_SUPABASE_URL=https://kmcranqbpmddvavoxhuj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server-Only Supabase Service Role Key (NEVER expose to client)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Production Base Application URL
NEXT_PUBLIC_APP_URL=https://lasador.in
```

> [!CAUTION]
> Never set `SUPABASE_SERVICE_ROLE_KEY` with a `NEXT_PUBLIC_` prefix. Next.js will bundle any variable prefixed with `NEXT_PUBLIC_` into the client-side JavaScript.

---

## 4. Database Initialization & Migrations

If deploying to a fresh database or confirming schema synchronization:

### Option A: Complete Schema via Supabase Dashboard SQL Editor
1. Log into your Supabase project dashboard at `https://supabase.com/dashboard/project/kmcranqbpmddvavoxhuj`.
2. Open the **SQL Editor**.
3. Copy the full content of `supabase/full_schema.sql` and run the script.
4. (Optional) Run `supabase/seed.sql` to populate initial categories, products, portion variants, modifier groups, and dining tables.

### Option B: Sequential Migrations
Run the migration files in numerical sequence:
1. `supabase/migrations/20261121000000_restaurant_settings.sql`
2. `supabase/migrations/20261121000001_staff_and_rbac.sql`
3. `supabase/migrations/20261121000002_menu_management.sql`
4. `supabase/migrations/20261121000003_tables_and_qr.sql`
5. `supabase/migrations/20261121000004_orders_and_billing.sql`
6. `supabase/migrations/20261121000005_fix_profile_recursion.sql`

---

## 5. Initial Owner Account Creation

To provision the primary restaurant owner account:
1. In the Supabase Dashboard, go to **Authentication -> Users** and click **Add User -> Create User**.
2. Enter the owner email (e.g. `owner@lasador.in`) and a secure password. Check **Auto Confirm User**.
3. Note the generated user UUID.
4. In the **SQL Editor**, associate the user with the `owner` role:
   ```sql
   INSERT INTO public.profiles (id, email, full_name, role, is_active)
   SELECT id, email, 'General Manager', 'owner', true
   FROM auth.users
   WHERE id = '<USER_UUID>'
   ON CONFLICT (id) DO UPDATE SET role = 'owner', is_active = true;
   ```
5. The owner can now log in at `/admin/login` and provision subsequent staff members (`admin`, `manager`, `kitchen`, `bar`) directly via the UI at `/admin/staff`.

---

## 6. Building and Running the Application

### 6.1 Local or Self-Hosted Production Build
```bash
# 1. Install dependencies
npm ci

# 2. Run verification test suites
npm test

# 3. Type-check and lint
npm run type-check
npm run lint

# 4. Generate optimized production build
npm run build

# 5. Start production server
npm run start -p 3000
```

### 6.2 Vercel Deployment
1. Connect your Git repository to Vercel.
2. Select Framework Preset: **Next.js**.
3. Root Directory: `./`.
4. Configure the 4 Environment Variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`).
5. Deploy.

---

## 7. Post-Deployment Verification Checklist

- [ ] Visit `/api/health` and verify `{"status":"ok"}`.
- [ ] Log into `/admin/login` using the owner credentials.
- [ ] Verify that `/admin/menu` loads all categories and products.
- [ ] Verify that `/admin/tables` renders the table grid and generates vector SVG QR codes.
- [ ] Test scanning a table QR URL (`/t/<token>`) on a mobile smartphone.
- [ ] Submit a test order from the mobile device and verify that it chimes and appears on the KDS at `/kitchen` and BDS at `/bar`.
- [ ] Generate and settle a test bill at `/admin/billing` and verify thermal receipt generation.
- [ ] Check `/admin/audit-logs` to confirm that all actions were logged with staff identities.
