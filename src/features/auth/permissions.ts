import { StaffRole } from "@/types/database.types";

export type AppPermission =
  | "settings:view"
  | "settings:manage"
  | "staff:view"
  | "staff:manage"
  | "menu:view"
  | "menu:manage"
  | "tables:view"
  | "tables:manage"
  | "orders:view"
  | "orders:manage"
  | "kitchen:view"
  | "kitchen:update"
  | "bar:view"
  | "bar:update"
  | "bills:view"
  | "bills:settle"
  | "audit:view";

/**
 * Role-to-Permissions Mapping for L'Asador – Grill & Brew.
 * Enforced on both server-side actions and database RLS.
 */
export const ROLE_PERMISSIONS: Record<StaffRole, AppPermission[]> = {
  owner: [
    "settings:view",
    "settings:manage",
    "staff:view",
    "staff:manage",
    "menu:view",
    "menu:manage",
    "tables:view",
    "tables:manage",
    "orders:view",
    "orders:manage",
    "kitchen:view",
    "kitchen:update",
    "bar:view",
    "bar:update",
    "bills:view",
    "bills:settle",
    "audit:view",
  ],
  admin: [
    "settings:view",
    "settings:manage",
    "staff:view",
    "staff:manage",
    "menu:view",
    "menu:manage",
    "tables:view",
    "tables:manage",
    "orders:view",
    "orders:manage",
    "kitchen:view",
    "kitchen:update",
    "bar:view",
    "bar:update",
    "bills:view",
    "bills:settle",
    "audit:view",
  ],
  manager: [
    "settings:view",
    "staff:view",
    "menu:view",
    "menu:manage",
    "tables:view",
    "tables:manage",
    "orders:view",
    "orders:manage",
    "kitchen:view",
    "bar:view",
    "bills:view",
    "bills:settle",
  ],
  kitchen: [
    "kitchen:view",
    "kitchen:update",
    "orders:view",
  ],
  bar: [
    "bar:view",
    "bar:update",
    "orders:view",
  ],
};

/**
 * Checks whether a given role possesses a specific permission.
 */
export function hasPermission(role: StaffRole, permission: AppPermission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Hierarchy check for staff management:
 * - Owners can manage any staff member and assign any role.
 * - Admins can manage managers, kitchen, and bar staff, but cannot modify/create Owners or other Admins.
 * - Managers, Kitchen, and Bar staff cannot manage staff accounts.
 */
export function canManageStaffRole(actorRole: StaffRole, targetRole: StaffRole): boolean {
  if (actorRole === "owner") return true;
  if (actorRole === "admin") {
    return targetRole !== "owner" && targetRole !== "admin";
  }
  return false;
}

/**
 * Checks if a role is permitted to access the administrative dashboard backoffice.
 * Kitchen and Bar roles are restricted to station-specific display views.
 */
export function canAccessAdminPanel(role: StaffRole): boolean {
  return role === "owner" || role === "admin" || role === "manager";
}
