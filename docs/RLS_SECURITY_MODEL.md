# L'Asador – Grill & Brew | Row Level Security & RBAC Model
**Location:** Sector 82, JLPL Industrial Area, Mohali, Punjab, India  
**Document Version:** 2.0.0 (Phase 2 Foundation)  

---

## 1. Security Philosophy & Principles

The security model for L'Asador enforces defense-in-depth across the application and database tiers:

1. **Default Deny:** Row Level Security (RLS) is enabled on all 22 database tables without exception. Tables without matching permissive policies reject all operations.
2. **Untrusted Client Inputs:** Client applications never provide role claims directly. Roles are determined exclusively inside PostgreSQL via `auth.uid()` mapped against `public.profiles`.
3. **No Self-Role Escalation:** Staff can update their personal contact details (phone, name), but database-level `WITH CHECK` assertions forbid mutating the `role` column.
4. **Isolated Service-Role Access:** Administrative routines, webhooks, and migrations that bypass RLS run strictly on the server using `SUPABASE_SERVICE_ROLE_KEY`. A runtime browser barrier throws an immediate exception if imported on the client.
5. **No Direct Plaintext Secrets:** Dining table QR codes use hashed token validation (`token_hash`) via SHA-256. Public clients cannot inspect raw QR tokens.

---

## 2. Staff Role Hierarchy

```
+--------------------------------------------------------------+
|                            OWNER                             |
|       Full operational, staff, financial & system control    |
+------------------------------+-------------------------------+
                               |
                               v
+--------------------------------------------------------------+
|                            ADMIN                             |
|       System settings, staff provisioning, full menu/tables  |
+------------------------------+-------------------------------+
                               |
                               v
+--------------------------------------------------------------+
|                           MANAGER                            |
|       Menu availability, table sessions, order management,   |
|       and bill payment settlement                            |
+--------------------+-------------------------+---------------+
                     |                         |
                     v                         v
+-------------------------------+  +-------------------------------+
|            KITCHEN            |  |              BAR              |
| Live KDS ticket receipt and   |  | Live BDS ticket receipt and   |
| prep status updates on        |  | prep status updates on        |
| kitchen line items            |  | draft taps & cocktail items   |
+-------------------------------+  +-------------------------------+
```

### RBAC PostgreSQL Helper Functions
All helper functions are defined with `SECURITY DEFINER` and a fixed `SET search_path = public` to prevent search-path hijacking attacks:

- `get_auth_role()`: Returns current user's active `staff_role`.
- `is_staff()`: Returns `true` if `auth.uid()` belongs to an active profile.
- `is_owner_or_admin()`: Returns `true` if role is `'owner'` or `'admin'`.
- `is_manager_or_above()`: Returns `true` if role is `'owner'`, `'admin'`, or `'manager'`.

---

## 3. RLS Policy Matrix by Domain

| Table | Public (Unauthenticated / Guest) | Kitchen Station | Bar Station | Manager | Admin / Owner |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`restaurant_settings`** | SELECT (Read-only) | SELECT | SELECT | SELECT | SELECT, UPDATE |
| **`business_hours`** | SELECT (Read-only) | SELECT | SELECT | SELECT | ALL (CRUD) |
| **`tax_settings`** | SELECT (Read-only) | SELECT | SELECT | SELECT | ALL (CRUD) |
| **`staff_roles`** | No access | SELECT | SELECT | SELECT | SELECT |
| **`staff_permissions`** | No access | SELECT | SELECT | SELECT | ALL (CRUD) |
| **`profiles`** | No access | SELECT, UPDATE (Self, contact only) | SELECT, UPDATE (Self, contact only) | SELECT, UPDATE (Self, contact only) | ALL (CRUD, including role assignment) |
| **`categories`** | SELECT (`is_active = true`) | SELECT (All) | SELECT (All) | ALL (CRUD) | ALL (CRUD) |
| **`products`** | SELECT (`is_available = true`) | SELECT (All) | SELECT (All) | ALL (CRUD) | ALL (CRUD) |
| **`product_images`** | SELECT | SELECT | SELECT | ALL (CRUD) | ALL (CRUD) |
| **`product_variants`** | SELECT (`is_available = true`) | SELECT (All) | SELECT (All) | ALL (CRUD) | ALL (CRUD) |
| **`modifier_groups`** | SELECT | SELECT | SELECT | ALL (CRUD) | ALL (CRUD) |
| **`modifiers`** | SELECT (`is_available = true`) | SELECT (All) | SELECT (All) | ALL (CRUD) | ALL (CRUD) |
| **`product_modifier_groups`** | SELECT | SELECT | SELECT | ALL (CRUD) | ALL (CRUD) |
| **`dining_tables`** | SELECT (`is_active = true`) | SELECT (All) | SELECT (All) | ALL (CRUD) | ALL (CRUD) |
| **`table_qr_tokens`** | No direct access (Server RPC) | SELECT | SELECT | ALL (CRUD) | ALL (CRUD) |
| **`table_sessions`** | SELECT (`status = 'active'`) | SELECT | SELECT | ALL (CRUD) | ALL (CRUD) |
| **`orders`** | No direct write (Server RPC) | SELECT | SELECT | SELECT, UPDATE | SELECT, UPDATE |
| **`order_items`** | No direct write (Server RPC) | SELECT, UPDATE (Kitchen stations only) | SELECT, UPDATE (Bar stations only) | SELECT, UPDATE | SELECT, UPDATE |
| **`order_item_modifiers`** | No direct access | SELECT | SELECT | SELECT | SELECT |
| **`bills`** | No direct write (Server RPC) | SELECT | SELECT | ALL (Manage & settle) | ALL (Manage & settle) |
| **`payments`** | No direct write (Server RPC) | SELECT | SELECT | ALL (Collect & record) | ALL (Collect & record) |
| **`audit_logs`** | No access | INSERT (Internal) | INSERT (Internal) | INSERT (Internal) | SELECT, INSERT |

---

## 4. Self-Role Escalation Prevention Mechanics

A common vulnerability in role-based systems occurs when an authenticated user updates their own profile record (e.g., updating their phone number) and includes a modified `role` attribute in the update payload.

### The PostgreSQL Solution
L'Asador's `profiles` update policy strictly constrains self-updates:

```sql
CREATE POLICY "Staff can update own profile contact info without role escalation"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
  );
```

**How It Protects:**
1. The `USING` clause restricts the update target strictly to rows where `id = auth.uid()`.
2. The `WITH CHECK` clause verifies that the resulting row after the update has `role` exactly matching the existing persisted role in `profiles`.
3. If an attacker attempts `UPDATE profiles SET role = 'owner' WHERE id = auth.uid()`, PostgreSQL detects the role mismatch and immediately aborts the transaction with an RLS check violation.
4. Only users with `is_owner_or_admin()` can pass the administrative policy (`CREATE POLICY "Owner and Admin can manage all profiles"`).

---

## 5. Client vs. Server Service-Role Isolation

1. **Client Browser (`createBrowserClient`):**
   - Uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Subject to all PostgreSQL RLS policies.
   - Cannot read administrative tables or update order pricing.
2. **Server Runtime (`createServerSupabaseClient`):**
   - Uses session cookies synchronized by middleware.
   - Operates in the security context of the authenticated staff member or guest.
3. **Server Admin Client (`createAdminClient`):**
   - Uses `SUPABASE_SERVICE_ROLE_KEY`.
   - Explicit runtime guard:
     ```ts
     if (typeof window !== "undefined") {
       throw new Error("SECURITY VIOLATION: createAdminClient() invoked in a browser/client environment!");
     }
     ```
   - Bundler verified: `.next/static/` contains **0 occurrences** of `SUPABASE_SERVICE_ROLE_KEY`.
