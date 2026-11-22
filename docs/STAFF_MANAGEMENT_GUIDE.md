# L'Asador – Grill & Brew | Staff Management & Provisioning Guide

**Location:** Sector 82, JLPL Industrial Area, Mohali, Punjab, India  
**Scope:** Phase 3 – Admin Foundation  
**System Type:** Single-Restaurant Platform  

---

## 1. Introduction

In L'Asador – Grill & Brew, staff accounts are strictly controlled and managed centrally. There is **no public sign-up form** for employees. All staff members are provisioned by authorized management personnel (Owners and Admins) through the Executive Console.

This guide outlines the workflows, safeguards, and best practices for creating, updating, and deactivating staff profiles.

---

## 2. Staff Account Lifecycle

```
[ Management Action: Provision ]
               │
               ▼
   1. Validate Email & Password (>= 8 chars)
   2. Verify Role Hierarchy Constraints
   3. Create Supabase Auth User (auth.admin.createUser)
   4. Upsert Staff Profile (public.profiles)
   5. Record Audit Event (staff:provision)
               │
               ▼
[ Active Staff Account in Roster ]
               │
               ├─────────────────────────┬─────────────────────────┐
               ▼                         ▼                         ▼
      [ Edit Details ]         [ Toggle Deactivate ]      [ Password Reset ]
      Update name, phone,      Sets is_active = false.    Triggered via
      or assigned station.     Kills active sessions;     forgot-password
      Hierarchy checked.       blocks login immediately.  flow or admin.
```

---

## 3. Provisioning a New Staff Member

### Prerequisites:
- Logged in with an account having `staff:manage` permission (`owner` or `admin`).
- If caller is `admin`, the role being assigned must be `manager`, `kitchen`, or `bar`.

### Step-by-Step Procedure:
1. Navigate to **Staff Management** (`/admin/staff`) in the Executive Console.
2. Click **"+ Provision New Staff Member"**.
3. Fill in the required fields:
   - **Full Name:** Official employee name (minimum 2 characters).
   - **Email Address:** Work or primary email address (must be unique).
   - **Phone Number (Optional):** Indian mobile contact format (+91 or 10 digits).
   - **Initial Temporary Password:** Minimum 8 characters. Must be communicated securely to the employee.
   - **Operational Role:** Select one of:
     - `owner` *(Only visible/assignable if you are logged in as an Owner)*
     - `admin` *(Only visible/assignable if you are logged in as an Owner)*
     - `manager`
     - `kitchen`
     - `bar`
4. Click **"Provision Account"**.
5. The system performs atomic creation:
   - Creates the authentication record in `auth.users` with `email_confirm = true`.
   - Inserts the corresponding row in `public.profiles` linking to `auth.users.id`.
   - Logs an immutable audit event (`staff:provision`).
   - If profile creation fails, the auth user is automatically rolled back to prevent orphaned accounts.

---

## 4. Editing Staff Profiles

1. In the Staff Roster table, click **"Edit Profile"** on any staff row.
2. The edit modal permits modification of:
   - **Full Name**
   - **Phone Number**
   - **Assigned Role**
   - **Account Status (Active / Deactivated)**
3. **Hierarchy Enforcement:**
   - Admins attempting to edit an Owner or another Admin will be rejected by the server.
   - Any staff member attempting to edit their own role will be rejected with an explicit security violation.
4. Click **"Save Changes"**.
5. An audit event (`staff:update`) is recorded capturing previous and new roles.

---

## 5. Deactivation vs Deletion

L'Asador adheres to strict **audit and financial integrity standards**:
- **Staff accounts are NEVER deleted from the database.** Deleting a staff account would break foreign key relationships on past orders, kitchen ticket logs, and billing audit trails.
- **Deactivation (`is_active = false`)** is the sanctioned mechanism for employee offboarding or leave of absence:
  - Deactivated staff cannot sign in.
  - Any active session for a deactivated account is immediately invalidated upon their next server request.
  - Historical attribution on past orders, settlements, and audit logs remains intact.

---

## 6. Password Reset & Recovery Workflow

1. If an employee forgets their password, they can click **"Forgot your password?"** on the login screen (`/admin/forgot-password`).
2. Submitting their email triggers a password recovery email sent via Supabase Auth.
3. The email link redirects to `/admin/reset-password`, where the employee enters a new password.
4. The password update is validated (minimum 8 characters) and committed to Supabase Auth.
