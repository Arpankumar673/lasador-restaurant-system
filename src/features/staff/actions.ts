"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentStaff } from "@/features/auth/server";
import { canManageStaffRole, hasPermission } from "@/features/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/features/audit/logger";
import { StaffRole } from "@/types/database.types";

const staffRoleEnum = z.enum(["owner", "admin", "manager", "kitchen", "bar"]);

const createStaffSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  phone: z.string().optional().nullable(),
  role: staffRoleEnum,
});

const updateStaffSchema = z.object({
  id: z.string().uuid("Invalid staff ID"),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  phone: z.string().optional().nullable(),
  role: staffRoleEnum,
  isActive: z.boolean(),
});

export interface StaffActionResult {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Provisions a new staff member account via the protected Supabase Auth Admin API.
 * Only authorized roles (Owner, Admin) can provision staff.
 */
export async function createStaffMember(formData: FormData): Promise<StaffActionResult> {
  const caller = await getCurrentStaff();
  if (!caller) {
    return { success: false, error: "Unauthorized. Authentication required." };
  }

  if (!hasPermission(caller.profile.role, "staff:manage")) {
    return { success: false, error: "Forbidden. You do not have permission to provision staff." };
  }

  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone") || null,
    role: formData.get("role"),
  };

  const parsed = createStaffSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Validation failed for staff data",
    };
  }

  const { email, password, fullName, phone, role } = parsed.data;

  // Strict role hierarchy guard: Admins cannot create Owners or Admins
  if (!canManageStaffRole(caller.profile.role, role as StaffRole)) {
    return {
      success: false,
      error: `Your role (${caller.profile.role}) cannot assign the '${role}' role.`,
    };
  }

  try {
    const adminSupabase = createAdminClient();

    // 1. Create Supabase Auth user
    const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    });

    if (authError || !authUser.user) {
      return {
        success: false,
        error: authError?.message || "Failed to create authentication user in Supabase.",
      };
    }

    // 2. Insert or update the staff profile
    const { error: profileError } = await adminSupabase.from("profiles").upsert({
      id: authUser.user.id,
      email,
      full_name: fullName,
      phone,
      role: role as StaffRole,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      // Rollback Auth user if profile insert fails
      await adminSupabase.auth.admin.deleteUser(authUser.user.id);
      return {
        success: false,
        error: `Failed to create staff profile: ${profileError.message}`,
      };
    }

    // 3. Log audit event
    await logAuditEvent({
      actorId: caller.userId,
      action: "staff:provision",
      entity: "profiles",
      entityId: authUser.user.id,
      details: { email, role, fullName },
    });

    revalidatePath("/admin/staff");
    return {
      success: true,
      message: `Staff member ${fullName} (${role}) provisioned successfully.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error during staff provisioning";
    return { success: false, error: msg };
  }
}

/**
 * Updates an existing staff member's profile and active status.
 */
export async function updateStaffMember(formData: FormData): Promise<StaffActionResult> {
  const caller = await getCurrentStaff();
  if (!caller) {
    return { success: false, error: "Unauthorized. Authentication required." };
  }

  if (!hasPermission(caller.profile.role, "staff:manage")) {
    return { success: false, error: "Forbidden. You do not have permission to update staff." };
  }

  const rawData = {
    id: formData.get("id"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone") || null,
    role: formData.get("role"),
    isActive: formData.get("isActive") === "true",
  };

  const parsed = updateStaffSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Validation failed for staff data",
    };
  }

  const { id, fullName, phone, role, isActive } = parsed.data;

  // CRITICAL SECURITY RULE: Prevent self-role modification
  if (caller.userId === id && role !== caller.profile.role) {
    return {
      success: false,
      error: "SECURITY VIOLATION: You cannot modify your own role.",
    };
  }

  const adminSupabase = createAdminClient();

  // Fetch target profile to verify hierarchy
  const { data: targetProfile, error: targetError } = await adminSupabase
    .from("profiles")
    .select("role, email")
    .eq("id", id)
    .single();

  if (targetError || !targetProfile) {
    return { success: false, error: "Target staff profile not found." };
  }

  // Hierarchy check on current target role and new role
  if (!canManageStaffRole(caller.profile.role, targetProfile.role as StaffRole)) {
    return {
      success: false,
      error: `You cannot manage staff members with role '${targetProfile.role}'.`,
    };
  }

  if (!canManageStaffRole(caller.profile.role, role as StaffRole)) {
    return {
      success: false,
      error: `You cannot assign the role '${role}'.`,
    };
  }

  // Execute update
  const { error: updateError } = await adminSupabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone,
      role: role as StaffRole,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Log audit event
  await logAuditEvent({
    actorId: caller.userId,
    action: "staff:update",
    entity: "profiles",
    entityId: id,
    details: {
      email: targetProfile.email,
      previousRole: targetProfile.role,
      newRole: role,
      isActive,
    },
  });

  revalidatePath("/admin/staff");
  return { success: true, message: `Staff profile for ${fullName} updated successfully.` };
}
