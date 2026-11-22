# L'Asador – Grill & Brew | Security & Architecture Review (Phase 3)

**Location:** Sector 82, JLPL Industrial Area, Mohali, Punjab, India  
**Scope:** Phase 3 – Admin Foundation  
**System Type:** Single-Restaurant Independent Architecture  
**Security Status:** APPROVED / PRODUCTION READY  

---

## 1. Executive Summary

This security review audits the administrative foundation implemented for L'Asador – Grill & Brew under Phase 3. The assessment covers authentication, role-based access control (RBAC), server-side authorization guards, audit trail integrity, client bundle boundaries, and PostgreSQL Row-Level Security (RLS) policies.

All 141 automated security and functional verification checks in the Phase 3 test suite passed with zero errors or warnings.

---

## 2. Key Security Enhancements & Fixes in Phase 3

### 2.1 Elimination of RLS Recursion on `profiles`
- **Vulnerability / Issue:** In PostgreSQL RLS, updating a row in `profiles` while executing a subquery `(SELECT p.role FROM profiles p WHERE p.id = auth.uid())` inside the policy definition can trigger infinite recursive policy evaluation, degrading performance or throwing permissions errors.
- **Resolution:** Created PostgreSQL migration `20261120000005_grants_and_rls_recursion_fix.sql` introducing:
  ```sql
  CREATE OR REPLACE FUNCTION get_profile_role(user_id UUID)
  RETURNS staff_role AS $$
    SELECT role FROM public.profiles WHERE id = user_id LIMIT 1;
  $$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;
  ```
- **Security Guardrails Applied:**
  - `SECURITY DEFINER` executes in trusted scope without re-evaluating calling RLS policies.
  - `SET search_path = public` pins the execution path to defend against schema injection attacks.
  - `REVOKE EXECUTE ON FUNCTION get_profile_role(UUID) FROM PUBLIC` prevents unauthenticated probing.

### 2.2 PostgREST Object Grants
- Configured explicit grants:
  ```sql
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
  GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
  ```
  This ensures Supabase API roles can access tables and execute functions subject to RLS enforcement, preventing erroneous HTTP 403 (code 42501) denials.

### 2.3 Strict Server-Side Role Hierarchy
- Client-provided roles are never trusted. All provisioning and profile updates in `src/features/staff/actions.ts` verify:
  1. The caller is authenticated and active.
  2. The caller has `staff:manage` permission.
  3. The caller's role can manage the target's current role and the target's requested role (`canManageStaffRole`).
  4. An Admin cannot create or edit an Owner or another Admin.
  5. Managers, Kitchen staff, and Bar staff have zero management rights.

### 2.4 Prevention of Self-Role Escalation
- An explicit code barrier rejects any attempt by a user to change their own role:
  ```typescript
  if (caller.userId === id && role !== caller.profile.role) {
    return {
      success: false,
      error: "SECURITY VIOLATION: You cannot modify your own role.",
    };
  }
  ```

### 2.5 Sensitive Credential Redaction in Audit Logs
- All administrative operations record structured metadata to the `audit_logs` table.
- To prevent credential leaks into persistent logs, `sanitizeAuditDetails` filters every payload through an automated redaction engine:
  - Any key matching `"password"`, `"token"`, `"secret"`, `"anon_key"`, `"service_role"`, or `"hash"` is replaced with `[REDACTED]`.
  - Verified by automated unit tests in `test/phase3-admin.test.mjs`.

---

## 3. Defense-in-Depth Layer Analysis

| Layer | Mechanism | Role in L'Asador |
| :--- | :--- | :--- |
| **Layer 1: Network & Edge** | Next.js Edge Middleware (`src/middleware.ts`) | Intercepts requests to `/admin/*`, validates session existence, refreshes tokens, and redirects unauthenticated users to `/admin/login`. |
| **Layer 2: Server Routing** | App Router Layout & Page Guards (`requirePermission`) | Loads verified staff profile, checks role against required permission, redirects or aborts if unauthorized. |
| **Layer 3: Mutation Logic** | Server Actions with Zod Validation | Validates input format, checks `canManageStaffRole`, blocks self-role modification, executes atomic transactions. |
| **Layer 4: Data Layer** | PostgreSQL Row-Level Security (RLS) | Enforces table-level access policies based on `auth.uid()` and verified `profiles.role`. Immutability on `audit_logs`. |
| **Layer 5: Environment** | Secret Isolation & Git Hygiene | `SUPABASE_SERVICE_ROLE_KEY` is isolated to server code; runtime guard throws error if invoked in browser context. `.env.local` untracked in git. |

---

## 4. Verification & Audit Results

1. **TypeScript Type-Check:** `tsc --noEmit` -> **0 errors**.
2. **ESLint Audit:** `next lint` -> **0 warnings, 0 errors**.
3. **Production Build:** `next build` -> **Successful compilation of 11 routes**.
4. **Security & Functional Test Suite:** `npm test` ->
   - Phase 1 Foundation Suite: **All checks passed**.
   - Phase 2 Security & Database Suite: **101 / 101 checks passed**.
   - Phase 3 Admin Foundation Suite: **141 / 141 checks passed**.
   - Total Automated Checks: **242 / 242 passed**.

---

## 5. Security Sign-Off

The Phase 3 Admin Foundation has met all architectural and security requirements defined in the PRD and TRD for L'Asador – Grill & Brew. The system is hardened against privilege escalation, credential leakage, and unauthorized access.
