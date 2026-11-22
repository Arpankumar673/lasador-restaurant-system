# L'Asador – Grill & Brew | Authentication Architecture

**Location:** Sector 82, JLPL Industrial Area, Mohali, Punjab, India  
**Scope:** Phase 3 – Admin Foundation  
**Architecture:** Single-Restaurant Independent Platform  

---

## 1. Overview & Core Principles

L'Asador's authentication system is built strictly on **Supabase Auth** combined with **Next.js 14 App Router (SSR)**. It provides a secure, role-driven identity layer for restaurant staff and administrators without exposing sensitive credentials or introducing multi-tenant SaaS overhead.

### Key Architectural Tenets:
1. **Single-Restaurant Scoping:** No `tenant_id`, organization switching, or multi-tenant database logic.
2. **Server-Side Session Verification:** Client-side claims are never trusted for authorization decisions. The user's cryptographic JWT is verified against Supabase Auth on the server.
3. **Double-Layer Defense:**
   - **Layer 1 (Edge Middleware):** Intercepts requests to `/admin/*`, validates session existence, refreshes auth tokens, and redirects unauthenticated visitors to `/admin/login`.
   - **Layer 2 (Server Component & Action Guards):** Verifies active user profile, validates role permissions, and blocks unauthorized operational execution.
4. **Zero Public Staff Registration:** Staff accounts cannot be registered via public signup forms. All accounts are provisioned by authorized administrators using the Supabase Auth Admin API on the server.
5. **Strict Key Isolation:** `SUPABASE_SERVICE_ROLE_KEY` is restricted entirely to server-side background handlers and never enters client-side bundles.

---

## 2. Authentication Flow Architecture

```
                    ┌────────────────────────────┐
                    │ Browser / Staff Device     │
                    └─────────────┬──────────────┘
                                  │
                  1. POST Credentials (HTTPS)
                                  ▼
               ┌──────────────────────────────────────┐
               │ Next.js Server Action: signInStaff() │
               └──────────────────┬───────────────────┘
                                  │
         2. Verify Password       │ 3. Returns Session JWT & Sets
            with Supabase Auth    │    HttpOnly Secure Cookie
                                  ▼
               ┌──────────────────────────────────────┐
               │ Supabase Auth (auth.users)           │
               └──────────────────┬───────────────────┘
                                  │
         4. Verify Active Profile │ (via Admin Client to avoid RLS race)
                                  ▼
               ┌──────────────────────────────────────┐
               │ PostgreSQL (public.profiles)         │
               └──────────────────┬───────────────────┘
                                  │
                                  │ 5. Account Active & Valid?
                                  │    ├── NO  -> signOut() & Return Deactivated Error
                                  │    └── YES -> Update last_login_at, Log Audit Event
                                  ▼
               ┌──────────────────────────────────────┐
               │ Redirect to /admin (Authorized Shell)│
               └──────────────────────────────────────┘
```

---

## 3. Session Management & Cookie Handling

Session persistence and token refresh across Server Components, Server Actions, and Route Handlers are managed via `@supabase/ssr`:

- **Middleware (`src/middleware.ts` & `src/lib/supabase/middleware.ts`):**
  - Intercepts requests matching `/admin/:path*`.
  - Reads auth cookies from `NextRequest`.
  - Calls `supabase.auth.getUser()` to trigger token refresh if nearing expiration.
  - Propagates updated cookies back into both the response headers and the forwarded request headers.
  - Redirects unauthenticated users attempting to access protected admin pages (`/admin`, `/admin/staff`, `/admin/settings`, `/admin/audit-logs`) to `/admin/login`.
  - Redirects logged-in staff visiting public auth routes (`/admin/login`, `/admin/forgot-password`, `/admin/reset-password`) directly to `/admin`.

- **Server Supabase Client (`src/lib/supabase/server.ts`):**
  - Created using Next.js `cookies()` store from `next/headers`.
  - Operates under the user's authenticated scope for RLS enforcement.

- **Admin Supabase Client (`src/lib/supabase/admin.ts`):**
  - Instantiated with `SUPABASE_SERVICE_ROLE_KEY`.
  - Guarded by runtime check throwing fatal exception if executed in a browser environment.
  - Used strictly for staff provisioning (`auth.admin.createUser`), updating timestamps, and inserting audit logs.

---

## 4. Authentication Endpoints & Views

| Path | Access Level | Purpose |
| :--- | :--- | :--- |
| `/admin/login` | Public (Unauthenticated) | Staff email/password authentication form with flame/charcoal branding and error handling. |
| `/admin/forgot-password` | Public (Unauthenticated) | Sends password recovery email via Supabase Auth with redirect link to reset page. |
| `/admin/reset-password` | Authenticated / Token | Allows staff member to set a new password following a recovery link. |
| `/admin` | Protected (Staff Role) | Executive Console overview dashboard. |
| `/admin/staff` | Protected (`staff:view`) | Staff roster, provisioning modal, and role management. |
| `/admin/settings` | Protected (`settings:view`)| Restaurant parameters, operating schedule, and tax configuration. |
| `/admin/audit-logs` | Protected (`audit:view`) | Immutable chronological audit trail. |

---

## 5. Security & Deactivation Safeguards

1. **Deactivated Staff Lockdown:**
   When a staff member is marked `is_active = false`:
   - `signInStaff()` immediately terminates any active session via `supabase.auth.signOut()` and returns an explicit error.
   - `getCurrentStaff()` verifies `profile.is_active` on every server-rendered page or server action invocation; if inactive, it returns `null`, causing immediate redirect to the login screen.
2. **Session Sign-Out:**
   `signOutStaff()` invalidates the Supabase session token and clears the authentication cookie store, redirecting to `/admin/login`.
3. **Password Security:**
   Enforced minimum length of 8 characters via Zod validation schema. Password strings are automatically redacted from all audit logging payloads.
