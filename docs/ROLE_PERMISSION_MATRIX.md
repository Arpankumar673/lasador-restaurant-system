# L'Asador – Grill & Brew | Role & Permission Matrix (RBAC)

**Location:** Sector 82, JLPL Industrial Area, Mohali, Punjab, India  
**Scope:** Phase 3 – Admin Foundation  
**System Type:** Single-Restaurant Platform  

---

## 1. Role Taxonomy

L'Asador operates under 5 distinct operational roles:

1. **`owner` (Restaurant Proprietor / Master Administrator):**
   - Holds absolute administrative authority over the entire establishment.
   - Can manage all settings, taxes, staff accounts (including creating other owners and admins), menu items, tables, orders, kitchen, bar, and financial settlements.
   - Access to full security audit trails.

2. **`admin` (General Manager / System Administrator):**
   - Full operational management rights.
   - Can configure restaurant parameters, manage staff below Owner/Admin rank (Manager, Kitchen, Bar), edit menu items, configure tables, oversee live orders, and inspect audit logs.
   - **Constraint:** Cannot create, edit, or deactivate `owner` accounts or other `admin` accounts. Cannot promote anyone to `owner` or `admin`.

3. **`manager` (Floor / Shift Manager):**
   - Superintends front-of-house operations, dining tables, QR sessions, customer billing, and orders.
   - Can view staff contact info and restaurant parameters in read-only mode.
   - **Constraint:** Cannot modify restaurant settings, provision staff, or view security audit logs.

4. **`kitchen` (Head Chef / Line Cook / Grill Hearth Station):**
   - Dedicated to order prep and kitchen display systems (KDS).
   - Can view active tickets, mark items in preparation, and transition status to ready.
   - **Constraint:** Cannot access administrative settings, staff rosters, audit logs, or customer billing.

5. **`bar` (Bar Master / Mixologist / Craft Beer Tap Station):**
   - Dedicated to beverage prep and bar display systems (BDS).
   - Can view drink tickets and mark craft beers, cocktails, and wines as prepared/ready.
   - **Constraint:** Cannot access administrative settings, staff rosters, audit logs, or customer billing.

---

## 2. Granular Permissions Matrix

| Permission Identifier | Description | `owner` | `admin` | `manager` | `kitchen` | `bar` |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `settings:view` | View restaurant name, address, schedule, taxes | Yes | Yes | Yes | No | No |
| `settings:manage` | Modify restaurant parameters & emergency killswitch | Yes | Yes | No | No | No |
| `staff:view` | View staff roster, roles, phone, and status | Yes | Yes | Yes | No | No |
| `staff:manage` | Provision staff accounts, edit profiles, toggle active status | Yes | Yes | No | No | No |
| `menu:view` | View menu items, prices, variants, modifier groups | Yes | Yes | Yes | Yes | Yes |
| `menu:manage` | Create, update, or archive menu items and modifiers | Yes | Yes | Yes | No | No |
| `tables:view` | View dining tables, zones, and QR tokens | Yes | Yes | Yes | No | No |
| `tables:manage` | Configure tables, regenerate QR tokens, open/close sessions | Yes | Yes | Yes | No | No |
| `orders:view` | View live orders and customer ticket details | Yes | Yes | Yes | Yes | Yes |
| `orders:manage` | Modify, cancel, or prioritize orders | Yes | Yes | Yes | No | No |
| `kitchen:view` | View Kitchen Display System (KDS) food stations | Yes | Yes | Yes | Yes | No |
| `kitchen:update` | Update food station item status (prep, ready, served) | Yes | Yes | No | Yes | No |
| `bar:view` | View Bar Display System (BDS) drink stations | Yes | Yes | Yes | No | Yes |
| `bar:update` | Update drink station item status (pour, ready, served) | Yes | Yes | No | No | Yes |
| `bills:view` | View customer bills and payment statuses | Yes | Yes | Yes | No | No |
| `bills:settle` | Process payments and mark bills settled | Yes | Yes | Yes | No | No |
| `audit:view` | Inspect immutable security and administrative audit logs | Yes | Yes | No | No | No |

---

## 3. Staff Management & Provisioning Hierarchy

To prevent privilege escalation and unauthorized administrative modifications, staff management actions enforce strict hierarchical boundaries:

```
┌────────────────────────────────────────────────────────┐
│ Caller Role: OWNER                                     │
│   ├── Can provision/edit/deactivate: OWNER             │
│   ├── Can provision/edit/deactivate: ADMIN             │
│   ├── Can provision/edit/deactivate: MANAGER           │
│   ├── Can provision/edit/deactivate: KITCHEN           │
│   └── Can provision/edit/deactivate: BAR               │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ Caller Role: ADMIN                                     │
│   ├── CANNOT touch: OWNER accounts                     │
│   ├── CANNOT touch: Other ADMIN accounts               │
│   ├── Can provision/edit/deactivate: MANAGER           │
│   ├── Can provision/edit/deactivate: KITCHEN           │
│   └── Can provision/edit/deactivate: BAR               │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ Caller Roles: MANAGER, KITCHEN, BAR                    │
│   └── CANNOT manage any staff accounts (Zero rights)   │
└────────────────────────────────────────────────────────┘
```

---

## 4. Anti-Self-Escalation Rule

In addition to the hierarchy guard, the server enforces an absolute rule:

> **CRITICAL SECURITY RULE:** No user may modify their own role.  
> `if (caller.userId === targetId && newRole !== caller.profile.role)` -> **Rejected with Security Violation.**

This prevents:
1. An Admin attempting to promote themselves to Owner.
2. A compromised account attempting to elevate privileges during an active session.

---

## 5. PostgreSQL Row-Level Security (RLS) Mapping

The permission rules are mapped directly to database policies across PostgreSQL:

1. **`restaurant_settings`, `business_hours`, `tax_settings`:**
   - Public read for active restaurant parameters.
   - Write access restricted to users whose role in `profiles` is `owner` or `admin`.
2. **`profiles`:**
   - Staff can view their own profile and all other active staff profiles.
   - Staff can update their own contact info (`full_name`, `phone`) without altering their `role` (verified via `get_profile_role(auth.uid())`).
   - Only `owner` and `admin` can insert or update other staff profiles via server actions.
3. **`audit_logs`:**
   - Insertable only by internal server operations.
   - Selectable only by `owner` and `admin`.
   - Update and Delete operations are completely disabled (immutable append-only table).
