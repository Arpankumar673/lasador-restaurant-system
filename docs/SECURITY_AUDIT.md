# L'Asador – Grill & Brew | Comprehensive Security Audit

## 1. Executive Summary
This document provides a security assessment and architectural audit of **L'Asador – Grill & Brew**, Sector 82, JLPL Industrial Area, Mohali, Punjab.

The application has been engineered as an independent, single-restaurant system with zero multi-tenant exposure, zero external repository dependencies, and defense-in-depth security spanning authentication, database Row Level Security (RLS), cryptographic table tokens, and server-side authorization.

---

## 2. Single-Restaurant Architectural Isolation

### 2.1 Complete Absence of Multi-Tenancy
- **Audit Assertion**: Multi-tenancy abstractions introduce risk of accidental data leakage across organizations.
- **Verification Result**: PASS (Verified across all source files, migrations, actions, and types).
- **Checks**:
  - `tenant_id`: 0 occurrences.
  - `organization_id`: 0 occurrences.
  - Multi-tenant routing or restaurant switching: None.
  - The codebase targets exclusively L'Asador – Grill & Brew, Mohali.

### 2.2 Complete Isolation from TableTap
- **Audit Assertion**: No connection, reuse, or credential sharing with any legacy or reference systems (e.g. TableTap).
- **Verification Result**: PASS.
  - Dedicated Supabase Project URL: `https://kmcranqbpmddvavoxhuj.supabase.co`.
  - Zero TableTap URLs, secrets, environment variables, or databases are referenced anywhere in code or configuration.

---

## 3. Credential & Environment Security

### 3.1 Service-Role Key Boundary Protection
- **Vulnerability Guard**: The Supabase service-role key (`SUPABASE_SERVICE_ROLE_KEY`) bypasses PostgreSQL RLS. If exposed to browser client bundles, an attacker could read or modify any database record.
- **Architectural Safeguards**:
  1. `src/lib/supabase/client.ts` uses strictly `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  2. `src/lib/supabase/admin.ts` enforces a runtime guard:
     ```ts
     if (typeof window !== "undefined") {
       throw new Error("SECURITY VIOLATION: Service role client invoked in browser context!");
     }
     ```
  3. `next.config.mjs` restricts environment variable exposure.
  4. Automated build analysis confirms `SUPABASE_SERVICE_ROLE_KEY` does not exist in any client JS chunk emitted in `.next/static/chunks/`.

### 3.2 Git & Secret Tracking Prevention
- `.gitignore` explicitly ignores `.env`, `.env.local`, `.env.*.local`, and build artifacts.
- Untracked status verified via `git status`.

---

## 4. PostgreSQL Row Level Security (RLS) Audit

RLS is enabled on **100% of all 22 database tables**:

| Table | RLS Status | Public Access | Staff Access |
| :--- | :---: | :---: | :---: |
| `restaurant_settings` | ENABLED | SELECT (Active settings) | SELECT, UPDATE (`owner`, `admin`) |
| `business_hours` | ENABLED | SELECT | ALL (`owner`, `admin`, `manager`) |
| `tax_settings` | ENABLED | SELECT | ALL (`owner`, `admin`) |
| `staff_roles` | ENABLED | NONE | ALL (`owner`, `admin`) |
| `staff_permissions` | ENABLED | NONE | ALL (`owner`, `admin`) |
| `profiles` | ENABLED | NONE | SELECT own, ALL (`owner`, `admin`) |
| `categories` | ENABLED | SELECT (`is_active = true`) | ALL (`owner`, `admin`, `manager`) |
| `products` | ENABLED | SELECT (`is_active = true`) | ALL (`owner`, `admin`, `manager`) |
| `product_images` | ENABLED | SELECT | ALL (`owner`, `admin`, `manager`) |
| `product_variants` | ENABLED | SELECT | ALL (`owner`, `admin`, `manager`) |
| `modifier_groups` | ENABLED | SELECT | ALL (`owner`, `admin`, `manager`) |
| `modifiers` | ENABLED | SELECT | ALL (`owner`, `admin`, `manager`) |
| `product_modifier_groups` | ENABLED | SELECT | ALL (`owner`, `admin`, `manager`) |
| `dining_tables` | ENABLED | SELECT | ALL (`owner`, `admin`, `manager`) |
| `table_qr_tokens` | ENABLED | NONE | ALL (`owner`, `admin`, `manager`) |
| `table_sessions` | ENABLED | NONE (via Server Action) | ALL (`owner`, `admin`, `manager`) |
| `orders` | ENABLED | NONE (via Server Action) | ALL staff by role |
| `order_items` | ENABLED | NONE (via Server Action) | ALL staff by role |
| `order_item_modifiers` | ENABLED | NONE (via Server Action) | ALL staff by role |
| `bills` | ENABLED | NONE (via Server Action) | ALL (`owner`, `admin`, `manager`) |
| `payments` | ENABLED | NONE (via Server Action) | ALL (`owner`, `admin`, `manager`) |
| `audit_logs` | ENABLED | NONE | SELECT (`owner`, `admin`), INSERT (System) |

### 4.1 Recursion-Free Role Lookup
- Profile role evaluation uses a security-hardened PostgreSQL function:
  ```sql
  CREATE OR REPLACE FUNCTION public.get_profile_role(user_id uuid)
  RETURNS text
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path = public, pg_temp
  STABLE
  AS $$
    SELECT role FROM public.profiles WHERE id = user_id;
  $$;
  ```
- **Security Definer & Search Path Pinning**: Prevents infinite RLS recursion and protects against search path hijacking.

---

## 5. Cryptographic Table Security

1. **Token Entropy**: 32 cryptographically secure random bytes (64 hex characters) generated via `node:crypto.randomBytes(32)`.
2. **SHA-256 Hashing**: Tokens are hashed before storage in `table_qr_tokens.token_hash`. Plaintext tokens are never stored in the database.
3. **Session Binding**: Customer orders bind strictly to the verified table session associated with the active token hash.

---

## 6. Audit Logging & Credential Redaction

- Every administrative and financial action writes to `audit_logs`.
- Redaction filters automatically sanitize passwords, tokens, API keys, and sensitive credit data:
  ```ts
  const SENSITIVE_KEYS = ["password", "secret", "key", "token", "service_role"];
  ```
- Any payload containing sensitive fields is masked with `[REDACTED]` before insertion into the database.

---

## 7. Input Validation & Defense-in-Depth

- **Server-Side Validation**: All Server Actions validate inputs against strict Zod schemas (`src/lib/validations/`).
- **No Client Price Trust**: Line subtotals and taxes are re-computed from canonical database records.
- **Idempotency Protection**: Duplicate submissions blocked via unique client idempotency keys.
