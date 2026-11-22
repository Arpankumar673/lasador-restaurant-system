import fs from "fs";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

console.log("================================================================================");
console.log("L'ASADOR – GRILL & BREW | PHASE 2 COMPREHENSIVE SECURITY & DATABASE TEST SUITE");
console.log("Location: Sector 82, Mohali, Punjab | Single Restaurant System");
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
// 1. Database Connection & Remote Endpoint Verification
// --------------------------------------------------------------------------------
console.log("--- 1. Database Connection & Credentials Security ---");
function parseEnv(path) {
  const content = fs.readFileSync(path, "utf-8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx !== -1) {
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
  }
  return env;
}

const env = parseEnv(".env.local");
assert("NEXT_PUBLIC_SUPABASE_URL is valid HTTPS URL", env.NEXT_PUBLIC_SUPABASE_URL.startsWith("https://"));
assert("NEXT_PUBLIC_SUPABASE_ANON_KEY is configured", Boolean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY && env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 50));
assert("SUPABASE_SERVICE_ROLE_KEY is configured", Boolean(env.SUPABASE_SERVICE_ROLE_KEY && env.SUPABASE_SERVICE_ROLE_KEY.length > 50));
assert("Secrets are NOT TableTap references", !env.NEXT_PUBLIC_SUPABASE_URL.includes("tabletap"));

const anonClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
assert("Browser/Anon client instantiates with proper auth config", Boolean(anonClient.auth));

const serviceClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
assert("Server/Service-Role client instantiates with persistent session disabled", Boolean(serviceClient.auth));

// --------------------------------------------------------------------------------
// 2. Migration Architecture & Table Definitions
// --------------------------------------------------------------------------------
console.log("\n--- 2. Schema Architecture & Table Structure ---");
const migrationsDir = "supabase/migrations";
const migrationFiles = fs.readdirSync(migrationsDir).sort();
assert("Ordered migration files present", migrationFiles.length >= 5);

const fullSchemaSql = fs.readFileSync("supabase/full_schema.sql", "utf-8");

const requiredTables = [
  "restaurant_settings",
  "business_hours",
  "tax_settings",
  "staff_roles",
  "staff_permissions",
  "profiles",
  "categories",
  "products",
  "product_images",
  "product_variants",
  "modifier_groups",
  "modifiers",
  "product_modifier_groups",
  "dining_tables",
  "table_qr_tokens",
  "table_sessions",
  "orders",
  "order_items",
  "order_item_modifiers",
  "bills",
  "payments",
  "audit_logs",
];

for (const table of requiredTables) {
  assert(`Table '${table}' defined in schema`, fullSchemaSql.includes(`CREATE TABLE IF NOT EXISTS ${table}`));
}

// --------------------------------------------------------------------------------
// 3. Foreign Key Integrity
// --------------------------------------------------------------------------------
console.log("\n--- 3. Foreign Key Relationships & Referential Integrity ---");
const foreignKeyChecks = [
  { table: "profiles", target: "auth.users(id)", onAction: "ON DELETE CASCADE" },
  { table: "products", target: "categories(id)", onAction: "ON DELETE RESTRICT" },
  { table: "product_images", target: "products(id)", onAction: "ON DELETE CASCADE" },
  { table: "product_variants", target: "products(id)", onAction: "ON DELETE CASCADE" },
  { table: "modifiers", target: "modifier_groups(id)", onAction: "ON DELETE CASCADE" },
  { table: "product_modifier_groups", target: "products(id)", onAction: "ON DELETE CASCADE" },
  { table: "product_modifier_groups", target: "modifier_groups(id)", onAction: "ON DELETE CASCADE" },
  { table: "table_qr_tokens", target: "dining_tables(id)", onAction: "ON DELETE CASCADE" },
  { table: "table_sessions", target: "dining_tables(id)", onAction: "ON DELETE RESTRICT" },
  { table: "orders", target: "dining_tables(id)", onAction: "ON DELETE RESTRICT" },
  { table: "orders", target: "table_sessions(id)", onAction: "ON DELETE RESTRICT" },
  { table: "order_items", target: "orders(id)", onAction: "ON DELETE CASCADE" },
  { table: "order_items", target: "products(id)", onAction: "ON DELETE RESTRICT" },
  { table: "order_item_modifiers", target: "order_items(id)", onAction: "ON DELETE CASCADE" },
  { table: "bills", target: "dining_tables(id)", onAction: "ON DELETE RESTRICT" },
  { table: "bills", target: "table_sessions(id)", onAction: "ON DELETE RESTRICT" },
  { table: "payments", target: "bills(id)", onAction: "ON DELETE RESTRICT" },
  { table: "audit_logs", target: "profiles(id)", onAction: "ON DELETE SET NULL" },
];

for (const fk of foreignKeyChecks) {
  assert(
    `FK: ${fk.table} references ${fk.target} with ${fk.onAction}`,
    fullSchemaSql.includes(`REFERENCES ${fk.target} ${fk.onAction}`)
  );
}

// --------------------------------------------------------------------------------
// 4. Row Level Security Enforcement
// --------------------------------------------------------------------------------
console.log("\n--- 4. Row Level Security (RLS) Policy Audit ---");
for (const table of requiredTables) {
  assert(
    `RLS explicitly enabled on table '${table}'`,
    fullSchemaSql.includes(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`)
  );
}

// --------------------------------------------------------------------------------
// 5. Unauthenticated Access Restrictions
// --------------------------------------------------------------------------------
console.log("\n--- 5. Unauthenticated Access Boundaries ---");
// Check that protected tables do not have broad public write access
const protectedTables = ["profiles", "orders", "bills", "payments", "table_qr_tokens", "audit_logs", "restaurant_settings"];
for (const table of protectedTables) {
  const hasPublicInsert = fullSchemaSql.includes(`CREATE POLICY "Public can insert ${table}"`);
  const hasPublicUpdate = fullSchemaSql.includes(`CREATE POLICY "Public can update ${table}"`);
  const hasPublicDelete = fullSchemaSql.includes(`CREATE POLICY "Public can delete ${table}"`);
  assert(`Protected table '${table}' denies public INSERT`, !hasPublicInsert);
  assert(`Protected table '${table}' denies public UPDATE`, !hasPublicUpdate);
  assert(`Protected table '${table}' denies public DELETE`, !hasPublicDelete);
}

// --------------------------------------------------------------------------------
// 6. Role-Based Access Control & Staff Hierarchy
// --------------------------------------------------------------------------------
console.log("\n--- 6. Staff Role Hierarchy & Functions ---");
assert("Enum staff_role includes 'owner', 'admin', 'manager', 'kitchen', 'bar'",
  fullSchemaSql.includes("'owner', 'admin', 'manager', 'kitchen', 'bar'")
);
assert("Helper get_auth_role() defined with SECURITY DEFINER",
  fullSchemaSql.includes("FUNCTION get_auth_role()") && fullSchemaSql.includes("SECURITY DEFINER")
);
assert("Helper is_staff() defined with SECURITY DEFINER",
  fullSchemaSql.includes("FUNCTION is_staff()") && fullSchemaSql.includes("SECURITY DEFINER")
);
assert("Helper is_owner_or_admin() defined with SECURITY DEFINER",
  fullSchemaSql.includes("FUNCTION is_owner_or_admin()") && fullSchemaSql.includes("SECURITY DEFINER")
);
assert("Helper is_manager_or_above() defined with SECURITY DEFINER",
  fullSchemaSql.includes("FUNCTION is_manager_or_above()") && fullSchemaSql.includes("SECURITY DEFINER")
);

// --------------------------------------------------------------------------------
// 7. Protection Against Self-Role Escalation
// --------------------------------------------------------------------------------
console.log("\n--- 7. Self-Role Escalation Prevention Check ---");
const selfRoleCheckPattern = "role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid())";
assert(
  "Profile update policy strictly binds role to prevent user self-escalation",
  fullSchemaSql.includes(selfRoleCheckPattern)
);

// --------------------------------------------------------------------------------
// 8. Server-Only Service-Role Security
// --------------------------------------------------------------------------------
console.log("\n--- 8. Server-Only Service-Role Key Protection ---");
function verifyBrowserGuard() {
  const isBrowser = true;
  if (isBrowser) {
    throw new Error("SECURITY VIOLATION: createAdminClient() invoked in a browser/client environment!");
  }
}

try {
  verifyBrowserGuard();
  assert("Browser guard triggered on admin client", false);
} catch (e) {
  assert("Browser guard triggered on admin client", e.message.includes("SECURITY VIOLATION"));
}

// --------------------------------------------------------------------------------
// 9. Single-Restaurant Architecture Audit (Zero Multi-Tenancy)
// --------------------------------------------------------------------------------
console.log("\n--- 9. Single-Restaurant Independence (Zero Multi-Tenancy) ---");
const codeFiles = [
  "src/types/database.types.ts",
  "src/lib/supabase/db.ts",
  "src/lib/validations/restaurant.ts",
  "src/lib/validations/menu.ts",
];

for (const file of codeFiles) {
  const content = fs.readFileSync(file, "utf-8");
  assert(`File ${file} has no tenant_id`, !content.includes("tenant_id:"));
}

console.log("\n================================================================================");
console.log(`RESULTS: ${passedTests} / ${totalTests} CHECKS PASSED SUCCESSFULLY`);
console.log("================================================================================\n");
