# L'Asador – Grill & Brew | Independent Security & Penetration Audit

**Auditor**: Senior Database Security Specialist & Application Security Auditor  
**Scope**: Full Stack Security Audit (Next.js 14, Supabase PostgreSQL, RLS, RBAC, Cryptography)  
**Target Environment**: `https://kmcranqbpmddvavoxhuj.supabase.co` & Application Codebase  
**Date**: November 21, 2026  
**Auditing Standard**: OWASP ASVS Level 2, CIS PostgreSQL Benchmark, Principle of Least Privilege  

---

## 1. Executive Summary

This independent security audit evaluates the cybersecurity posture of **L'Asador – Grill & Brew**, Sector 82, JLPL Industrial Area, Mohali, Punjab.

The application has been audited against OWASP Top 10 vulnerabilities, role escalation, broken object level authorization (BOLA), client-side data tampering, cryptographic token vulnerability, and credential leaks.

### Key Audit Conclusions:
1. **Architectural Isolation**: **VERIFIED (0 Leaks)**. Complete absence of multi-tenancy (`tenant_id`, `organization_id`) and complete physical/logical isolation from TableTap.
2. **PostgreSQL Row Level Security (RLS)**: **VERIFIED**. Enabled on 100% of all 22 database tables with strict role-based and station-based filtering.
3. **Privilege Escalation Protection**: **VERIFIED**. Staff cannot escalate their own roles via self-update profiles (`WITH CHECK (role = get_profile_role(auth.uid()))`).
4. **Credential Boundary**: **VERIFIED**. Service-role key (`SUPABASE_SERVICE_ROLE_KEY`) is protected by browser guards and absent from all client webpack chunks.
5. **CRITICAL Operational Finding**: In the live Supabase instance, PostgreSQL table-level grants (`GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role`) from Migration 5 were not executed, resulting in `42501 permission denied` until applied.

---

## 2. Row Level Security (RLS) Policy Audit Matrix

Every table was inspected for RLS activation and policy constraints:

| Table Name | RLS Status | Public Policy | Staff Policy | Policy Strength |
| :--- | :---: | :--- | :--- | :---: |
| `restaurant_settings` | **ACTIVE** | `SELECT (true)` | `UPDATE (is_owner_or_admin())` | STRONG |
| `business_hours` | **ACTIVE** | `SELECT (true)` | `ALL (is_owner_or_admin())` | STRONG |
| `tax_settings` | **ACTIVE** | `SELECT (true)` | `ALL (is_owner_or_admin())` | STRONG |
| `staff_roles` | **ACTIVE** | NONE | `SELECT (is_staff())` | EXCELLENT |
| `staff_permissions` | **ACTIVE** | NONE | `SELECT (is_staff()), ALL (is_owner_or_admin())` | EXCELLENT |
| `profiles` | **ACTIVE** | NONE | `SELECT (is_staff()), UPDATE own, ALL (owner/admin)` | CRITICAL SECURED |
| `categories` | **ACTIVE** | `SELECT (is_active OR is_staff())` | `ALL (is_manager_or_above())` | STRONG |
| `products` | **ACTIVE** | `SELECT (is_available OR is_staff())`| `ALL (is_manager_or_above())` | STRONG |
| `product_images` | **ACTIVE** | `SELECT (true)` | `ALL (is_manager_or_above())` | STRONG |
| `product_variants` | **ACTIVE** | `SELECT (is_available OR is_staff())`| `ALL (is_manager_or_above())` | STRONG |
| `modifier_groups` | **ACTIVE** | `SELECT (true)` | `ALL (is_manager_or_above())` | STRONG |
| `modifiers` | **ACTIVE** | `SELECT (is_available OR is_staff())`| `ALL (is_manager_or_above())` | STRONG |
| `product_modifier_groups`| **ACTIVE** | `SELECT (true)` | `ALL (is_manager_or_above())` | STRONG |
| `dining_tables` | **ACTIVE** | `SELECT (is_active OR is_staff())` | `ALL (is_manager_or_above())` | STRONG |
| `table_qr_tokens` | **ACTIVE** | **NONE (Protected)** | `SELECT (is_staff()), ALL (is_manager_or_above())` | EXCELLENT |
| `table_sessions` | **ACTIVE** | `SELECT (status = 'active')` | `ALL (is_staff())` | STRONG |
| `orders` | **ACTIVE** | **NONE (Server Actions)** | `SELECT (is_staff()), UPDATE (is_staff())` | EXCELLENT |
| `order_items` | **ACTIVE** | **NONE (Server Actions)** | Station-filtered `UPDATE` (KDS vs BDS) | EXCELLENT |
| `order_item_modifiers` | **ACTIVE** | **NONE (Server Actions)** | `SELECT (is_staff())` | EXCELLENT |
| `bills` | **ACTIVE** | **NONE (Server Actions)** | `SELECT (is_staff()), ALL (manager/admin/owner)` | EXCELLENT |
| `payments` | **ACTIVE** | **NONE (Server Actions)** | `SELECT (is_staff()), ALL (manager/admin/owner)` | EXCELLENT |
| `audit_logs` | **ACTIVE** | **NONE** | `SELECT (owner/admin), INSERT (is_staff())` | IMMUTABLE |

---

## 3. Deep-Dive Security Assessments

### 3.1 Role Escalation Immunity (`profiles`)
- **Vulnerability**: A rogue staff member (e.g. kitchen or bar worker) sends an UPDATE query modifying their own profile: `UPDATE profiles SET role = 'owner' WHERE id = auth.uid()`.
- **Mitigation in Place**:
  ```sql
  CREATE POLICY "Staff can update own profile contact info without role escalation"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
      auth.uid() = id
      AND role = get_profile_role(auth.uid())
    );
  ```
- **Evaluation**: The `WITH CHECK` expression queries the existing database role via a recursion-free `SECURITY DEFINER` function (`get_profile_role`). If the updated `role` differs from the database role, PostgreSQL aborts the transaction with an RLS check violation.
- **Verdict**: **PASSED**. Self-role escalation is impossible.

### 3.2 Back-of-House Cross-Station Tampering (KDS vs BDS)
- **Vulnerability**: A kitchen cook attempts to mark bar cocktails as served, or a bartender modifies wood-fired grill steak orders.
- **Mitigation in Place**:
  1. **Database RLS Layer**:
     - `order_items` UPDATE for Kitchen:
       `USING (get_auth_role() IN ('owner', 'admin', 'manager', 'kitchen') AND station IN ('kitchen_grill', 'kitchen_fry', 'kitchen_pantry'))`
     - `order_items` UPDATE for Bar:
       `USING (get_auth_role() IN ('owner', 'admin', 'manager', 'bar') AND station IN ('bar_taps', 'bar_cocktails'))`
  2. **Application Server Action Layer** (`src/features/kitchen/actions.ts`):
     ```ts
     const isBarStation = item.station === "bar_taps" || item.station === "bar_cocktails";
     const requiredPermission = isBarStation ? "bar:update" : "kitchen:update";
     if (!hasPermission(caller.profile.role, requiredPermission)) {
       return { success: false, error: "Forbidden station operation." };
     }
     ```
- **Verdict**: **PASSED**. Dual-layer enforcement prevents cross-station tampering.

### 3.3 Customer QR Cryptography & Token Guessing
- **Vulnerability**: Diners sequential-scanning adjacent tables (e.g., guessing `?table=5` from `?table=4`) to inject fraudulent orders onto other tables' bills.
- **Mitigation in Place**:
  - Tokens are 32 bytes (256 bits) of cryptographic randomness generated via `crypto.randomBytes(32).toString('hex')`.
  - Search space is $2^{256} \approx 1.15 \times 10^{77}$ combinations—computationally impossible to brute force.
  - Plaintext tokens are NEVER stored in the database. Only `SHA-256(raw_token)` is persisted.
  - Active tokens can be revoked or rotated instantly by floor managers.
- **Verdict**: **PASSED**. High-entropy cryptographic protection verified.

### 3.4 Service-Role Key Client-Bundle Leak Audit
- **Vulnerability**: `SUPABASE_SERVICE_ROLE_KEY` embedded into Next.js client-side bundles, allowing public visitors to bypass RLS entirely.
- **Mitigation & Verification**:
  1. `src/lib/supabase/client.ts` strictly uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  2. `src/lib/supabase/admin.ts` implements a runtime window guard:
     ```ts
     if (typeof window !== "undefined") {
       throw new Error("SECURITY VIOLATION: Service role client invoked in browser context!");
     }
     ```
  3. Production build audit: Emitted bundles in `.next/static/chunks/` were scanned for the service key; **0 occurrences found**.
- **Verdict**: **PASSED**. Zero client-bundle leakage.

### 3.5 Immutable Audit Trail & Redaction
- **Vulnerability**: Logging plain passwords, API keys, or customer credit card data into audit records, or staff deleting audit records to conceal fraudulent activity.
- **Mitigation in Place**:
  1. `audit_logs` has NO `UPDATE` or `DELETE` RLS policies. It is append-only.
  2. `logAuditEvent` passes all details through a case-insensitive regex sanitizer that masks `password`, `secret`, `key`, `token`, and `service_role` with `[REDACTED]`.
- **Verdict**: **PASSED**. Audit logs are tamper-proof and credential-sanitized.
