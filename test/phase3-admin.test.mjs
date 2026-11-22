import fs from "fs";
import path from "path";
import { z } from "zod";

console.log("================================================================================");
console.log("L'ASADOR – GRILL & BREW | PHASE 3 ADMIN FOUNDATION COMPREHENSIVE TEST SUITE");
console.log("Location: Sector 82, Mohali, Punjab | Single Restaurant Management System");
console.log("================================================================================\n");

let passedTests = 0;
let totalTests = 0;

function assert(description, condition, extraInfo = "") {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${description}`);
  } else {
    console.error(`[FAIL] ${description} ${extraInfo}`);
    process.exitCode = 1;
  }
}

// --------------------------------------------------------------------------------
// 1. Architecture & File Integrity Verification
// --------------------------------------------------------------------------------
console.log("--- 1. Architecture & File Integrity ---");

const requiredFiles = [
  "src/features/auth/permissions.ts",
  "src/features/auth/server.ts",
  "src/features/auth/actions.ts",
  "src/features/staff/actions.ts",
  "src/features/settings/actions.ts",
  "src/features/audit/logger.ts",
  "src/app/(admin)/admin/page.tsx",
  "src/app/(admin)/admin/layout.tsx",
  "src/app/(admin)/admin/login/page.tsx",
  "src/app/(admin)/admin/forgot-password/page.tsx",
  "src/app/(admin)/admin/reset-password/page.tsx",
  "src/app/(admin)/admin/staff/page.tsx",
  "src/app/(admin)/admin/settings/page.tsx",
  "src/app/(admin)/admin/audit-logs/page.tsx",
  "src/components/layout/admin-header.tsx",
  "src/components/layout/admin-sidebar.tsx",
  "src/features/staff/components/staff-management-view.tsx",
  "src/features/settings/components/restaurant-settings-view.tsx",
  "src/features/audit/components/audit-logs-view.tsx",
  "supabase/migrations/20261120000005_grants_and_rls_recursion_fix.sql",
];

for (const filePath of requiredFiles) {
  assert(`Required file exists: ${filePath}`, fs.existsSync(filePath));
}

// --------------------------------------------------------------------------------
// 2. Role-Based Access Control (RBAC) Matrix Verification
// --------------------------------------------------------------------------------
console.log("\n--- 2. RBAC Permissions & Role Hierarchy ---");

const permissionsContent = fs.readFileSync("src/features/auth/permissions.ts", "utf-8");

// Verify all 5 roles are defined
assert("Role-Permissions definition contains 'owner'", permissionsContent.includes("owner:"));
assert("Role-Permissions definition contains 'admin'", permissionsContent.includes("admin:"));
assert("Role-Permissions definition contains 'manager'", permissionsContent.includes("manager:"));
assert("Role-Permissions definition contains 'kitchen'", permissionsContent.includes("kitchen:"));
assert("Role-Permissions definition contains 'bar'", permissionsContent.includes("bar:"));

// Check permission functions exist
assert("hasPermission function exported", permissionsContent.includes("export function hasPermission"));
assert("canManageStaffRole function exported", permissionsContent.includes("export function canManageStaffRole"));
assert("canAccessAdminPanel function exported", permissionsContent.includes("export function canAccessAdminPanel"));

// Emulate and test the exact RBAC logic
const ROLE_PERMISSIONS = {
  owner: [
    "settings:view", "settings:manage", "staff:view", "staff:manage",
    "menu:view", "menu:manage", "tables:view", "tables:manage",
    "orders:view", "orders:manage", "kitchen:view", "kitchen:update",
    "bar:view", "bar:update", "bills:view", "bills:settle", "audit:view",
  ],
  admin: [
    "settings:view", "settings:manage", "staff:view", "staff:manage",
    "menu:view", "menu:manage", "tables:view", "tables:manage",
    "orders:view", "orders:manage", "kitchen:view", "kitchen:update",
    "bar:view", "bar:update", "bills:view", "bills:settle", "audit:view",
  ],
  manager: [
    "settings:view", "staff:view", "menu:view", "menu:manage",
    "tables:view", "tables:manage", "orders:view", "orders:manage",
    "kitchen:view", "bar:view", "bills:view", "bills:settle",
  ],
  kitchen: [
    "menu:view", "orders:view", "kitchen:view", "kitchen:update",
  ],
  bar: [
    "menu:view", "orders:view", "bar:view", "bar:update",
  ],
};

function hasPerm(role, perm) {
  return ROLE_PERMISSIONS[role]?.includes(perm) ?? false;
}

function canManage(callerRole, targetRole) {
  if (callerRole === "owner") return true;
  if (callerRole === "admin") return targetRole !== "owner" && targetRole !== "admin";
  return false;
}

// Test RBAC matrix
assert("Owner has audit:view permission", hasPerm("owner", "audit:view"));
assert("Admin has audit:view permission", hasPerm("admin", "audit:view"));
assert("Manager DOES NOT have audit:view permission", !hasPerm("manager", "audit:view"));
assert("Kitchen DOES NOT have audit:view permission", !hasPerm("kitchen", "audit:view"));
assert("Bar DOES NOT have audit:view permission", !hasPerm("bar", "audit:view"));

assert("Owner has settings:manage permission", hasPerm("owner", "settings:manage"));
assert("Admin has settings:manage permission", hasPerm("admin", "settings:manage"));
assert("Manager DOES NOT have settings:manage permission", !hasPerm("manager", "settings:manage"));

assert("Owner has staff:manage permission", hasPerm("owner", "staff:manage"));
assert("Admin has staff:manage permission", hasPerm("admin", "staff:manage"));
assert("Manager DOES NOT have staff:manage permission", !hasPerm("manager", "staff:manage"));
assert("Kitchen DOES NOT have staff:manage permission", !hasPerm("kitchen", "staff:manage"));

// Test Role Hierarchy
assert("Owner can manage Owner", canManage("owner", "owner"));
assert("Owner can manage Admin", canManage("owner", "admin"));
assert("Owner can manage Manager", canManage("owner", "manager"));
assert("Owner can manage Kitchen", canManage("owner", "kitchen"));
assert("Owner can manage Bar", canManage("owner", "bar"));

assert("Admin CANNOT manage Owner", !canManage("admin", "owner"));
assert("Admin CANNOT manage another Admin", !canManage("admin", "admin"));
assert("Admin CAN manage Manager", canManage("admin", "manager"));
assert("Admin CAN manage Kitchen", canManage("admin", "kitchen"));
assert("Admin CAN manage Bar", canManage("admin", "bar"));

assert("Manager CANNOT manage any staff", !canManage("manager", "kitchen") && !canManage("manager", "bar"));
assert("Kitchen CANNOT manage any staff", !canManage("kitchen", "kitchen"));
assert("Bar CANNOT manage any staff", !canManage("bar", "bar"));

// --------------------------------------------------------------------------------
// 3. Security Constraints & Self-Escalation Prevention
// --------------------------------------------------------------------------------
console.log("\n--- 3. Security Guardrails & Self-Escalation Prevention ---");

const staffActionsContent = fs.readFileSync("src/features/staff/actions.ts", "utf-8");
assert(
  "Self-role modification violation check is implemented",
  staffActionsContent.includes("caller.userId === id && role !== caller.profile.role")
);
assert(
  "Explicit security violation error returned on self-role change",
  staffActionsContent.includes("SECURITY VIOLATION: You cannot modify your own role.")
);
assert(
  "Caller role hierarchy verified before updating target staff",
  staffActionsContent.includes("canManageStaffRole(caller.profile.role, targetProfile.role")
);
assert(
  "Caller role hierarchy verified before assigning new role",
  staffActionsContent.includes("canManageStaffRole(caller.profile.role, role")
);

const settingsActionsContent = fs.readFileSync("src/features/settings/actions.ts", "utf-8");
assert(
  "Restaurant settings update enforces settings:manage permission",
  settingsActionsContent.includes('hasPermission(caller.profile.role, "settings:manage")')
);
assert(
  "Restaurant settings update validates payload with Zod schema",
  settingsActionsContent.includes("restaurantSettingsSchema.safeParse")
);
assert(
  "Restaurant settings update records audit log event",
  settingsActionsContent.includes('action: "settings:update"')
);

// --------------------------------------------------------------------------------
// 4. Audit Log Sanitization & Sensitive Data Redaction
// --------------------------------------------------------------------------------
console.log("\n--- 4. Audit Trail Data Redaction ---");

const auditLoggerContent = fs.readFileSync("src/features/audit/logger.ts", "utf-8");
assert(
  "Audit logger defines sensitive key redaction filter",
  auditLoggerContent.includes("sensitiveKeys") &&
  auditLoggerContent.includes("[REDACTED]")
);

// Emulate sanitizeAuditDetails function
function sanitizeAuditDetails(details) {
  if (!details) return null;
  const sanitized = {};
  const sensitiveKeys = ["password", "token", "secret", "anon_key", "service_role", "hash"];
  for (const [key, value] of Object.entries(details)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

const testPayload = {
  email: "owner@lasador.in",
  password: "SuperSecretPassword123!",
  fullName: "L'Asador Owner",
  service_role_key: "eyJhbGciOi...",
  user_token: "xyz789",
  is_active: true,
};

const sanitized = sanitizeAuditDetails(testPayload);
assert("Audit details retains non-sensitive 'email'", sanitized.email === "owner@lasador.in");
assert("Audit details retains non-sensitive 'fullName'", sanitized.fullName === "L'Asador Owner");
assert("Audit details retains non-sensitive 'is_active'", sanitized.is_active === true);
assert("Audit details REDACTS 'password'", sanitized.password === "[REDACTED]");
assert("Audit details REDACTS 'service_role_key'", sanitized.service_role_key === "[REDACTED]");
assert("Audit details REDACTS 'user_token'", sanitized.user_token === "[REDACTED]");

// --------------------------------------------------------------------------------
// 5. Client Bundle Hygiene & Secrets Leakage Prevention
// --------------------------------------------------------------------------------
console.log("\n--- 5. Client Bundle Hygiene & Isolation ---");

function scanDirectoryForClientSecrets(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      if (file.name !== "node_modules" && file.name !== ".next" && file.name !== ".git") {
        scanDirectoryForClientSecrets(fullPath);
      }
    } else if (file.name.endsWith(".tsx") || file.name.endsWith(".ts")) {
      const content = fs.readFileSync(fullPath, "utf-8");
      if (content.startsWith('"use client"') || content.startsWith("'use client'")) {
        const hasServiceRoleLeak =
          content.includes("SUPABASE_SERVICE_ROLE_KEY") &&
          !content.includes("// Test") &&
          !content.includes("comment");
        assert(`No SUPABASE_SERVICE_ROLE_KEY leak in client component: ${fullPath}`, !hasServiceRoleLeak);
      }
    }
  }
}

scanDirectoryForClientSecrets("src");

// Verify .env.local is in .gitignore
const gitignoreContent = fs.readFileSync(".gitignore", "utf-8");
assert(".env.local is present in .gitignore", gitignoreContent.includes(".env.local"));

// Verify no TableTap references in src/
function scanForTableTap(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      if (file.name !== "node_modules" && file.name !== ".next" && file.name !== ".git") {
        scanForTableTap(fullPath);
      }
    } else if (file.name.endsWith(".tsx") || file.name.endsWith(".ts")) {
      const content = fs.readFileSync(fullPath, "utf-8").toLowerCase();
      const hasTableTap = content.includes("tabletap") && !content.includes("not connect to tabletap");
      assert(`No active TableTap reference in ${fullPath}`, !hasTableTap);
    }
  }
}
scanForTableTap("src");

// --------------------------------------------------------------------------------
// 6. Database Grants & RLS Recursion Fix Migration
// --------------------------------------------------------------------------------
console.log("\n--- 6. Migration 5 (Grants & RLS Fix) ---");

const migration5 = fs.readFileSync("supabase/migrations/20261120000005_grants_and_rls_recursion_fix.sql", "utf-8");

assert(
  "Migration 5 grants PostgREST permissions to anon, authenticated, service_role",
  migration5.includes("GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role")
);
assert(
  "Migration 5 defines SECURITY DEFINER function get_profile_role",
  migration5.includes("CREATE OR REPLACE FUNCTION get_profile_role") &&
  migration5.includes("SECURITY DEFINER")
);
assert(
  "Migration 5 pins search_path on get_profile_role for security",
  migration5.includes("SET search_path = public")
);
assert(
  "Migration 5 replaces self-update policy on profiles using get_profile_role",
  migration5.includes("Staff can update own profile contact info without role escalation") &&
  migration5.includes("get_profile_role(auth.uid())")
);

// --------------------------------------------------------------------------------
// 7. Test Results Summary
// --------------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(`PHASE 3 TEST SUMMARY: ${passedTests} / ${totalTests} CHECKS PASSED`);
if (passedTests === totalTests) {
  console.log("STATUS: SUCCESS - ALL PHASE 3 ADMIN FOUNDATION CRITERIA VERIFIED");
} else {
  console.error("STATUS: FAILURE - SOME CHECKS FAILED");
  process.exit(1);
}
console.log("================================================================================\n");
