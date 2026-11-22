import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { StaffRole, Database } from "@/types/database.types";
import { AppPermission, hasPermission } from "./permissions";

export type StaffProfile = Database["public"]["Tables"]["profiles"]["Row"];

export interface AuthenticatedStaff {
  userId: string;
  email: string;
  profile: StaffProfile;
}

/**
 * Retrieves the currently authenticated staff member on the server.
 * Returns null if no active session or if profile is inactive.
 */
export async function getCurrentStaff(): Promise<AuthenticatedStaff | null> {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const adminSupabase = createAdminClient();
  const { data: profile, error: profileError } = await adminSupabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || !profile.is_active) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email || profile.email,
    profile,
  };
}

/**
 * Requires an authenticated staff session.
 * Redirects to /admin/login if unauthenticated.
 */
export async function requireAuth(): Promise<AuthenticatedStaff> {
  const staff = await getCurrentStaff();
  if (!staff) {
    redirect("/admin/login");
  }
  return staff;
}

/**
 * Requires the current staff member to have one of the permitted roles.
 * Redirects or throws an authorization error if unauthorized.
 */
export async function requireRole(allowedRoles: StaffRole[]): Promise<AuthenticatedStaff> {
  const staff = await requireAuth();
  if (!allowedRoles.includes(staff.profile.role)) {
    redirect("/admin?error=unauthorized_role");
  }
  return staff;
}

/**
 * Requires the current staff member to have a specific permission.
 */
export async function requirePermission(permission: AppPermission): Promise<AuthenticatedStaff> {
  const staff = await requireAuth();
  if (!hasPermission(staff.profile.role, permission)) {
    redirect("/admin?error=unauthorized_permission");
  }
  return staff;
}
