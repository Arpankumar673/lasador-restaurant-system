"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/features/audit/logger";

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export interface AuthActionResult {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Signs in a staff member with email and password.
 * Strictly verifies that the staff profile exists and is active.
 */
export async function signInStaff(formData: FormData): Promise<AuthActionResult> {
  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");

  const parsed = signInSchema.safeParse({
    email: rawEmail,
    password: rawPassword,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid input data",
    };
  }

  const { email, password } = parsed.data;
  const supabase = createServerSupabaseClient();

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    return {
      success: false,
      error: "Invalid email or password. Please verify your staff credentials.",
    };
  }

  // Verify staff profile status using admin client
  const adminSupabase = createAdminClient();
  const { data: profile, error: profileError } = await adminSupabase
    .from("profiles")
    .select("role, is_active, full_name")
    .eq("id", authData.user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return {
      success: false,
      error: "No staff profile associated with this account. Contact an administrator.",
    };
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    return {
      success: false,
      error: "This staff account is currently deactivated. Please contact management.",
    };
  }

  // Update last login timestamp using admin client to guarantee update
  await adminSupabase
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", authData.user.id);

  // Log audit event
  await logAuditEvent({
    actorId: authData.user.id,
    action: "auth:login",
    entity: "profiles",
    entityId: authData.user.id,
    details: { email, role: profile.role },
  });

  revalidatePath("/admin", "layout");
  return { success: true };
}

/**
 * Signs out the current staff member.
 */
export async function signOutStaff(): Promise<void> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await logAuditEvent({
      actorId: user.id,
      action: "auth:logout",
      entity: "profiles",
      entityId: user.id,
    });
  }

  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/admin/login");
}

/**
 * Initiates the password recovery flow via Supabase Auth email.
 */
export async function requestPasswordRecovery(formData: FormData): Promise<AuthActionResult> {
  const rawEmail = formData.get("email");

  const parsed = forgotPasswordSchema.safeParse({ email: rawEmail });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid email address",
    };
  }

  const { email } = parsed.data;
  const supabase = createServerSupabaseClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/admin/reset-password`,
  });

  if (error) {
    console.error("Password recovery request error:", error.message);
  }

  // Always return a positive message to prevent user enumeration
  await logAuditEvent({
    action: "auth:password_recovery_requested",
    entity: "auth",
    details: { email },
  });

  return {
    success: true,
    message: "If a staff account exists for this email, password recovery instructions have been sent.",
  };
}

/**
 * Completes password reset with the new password.
 */
export async function updatePassword(formData: FormData): Promise<AuthActionResult> {
  const rawPassword = formData.get("password");

  const parsed = resetPasswordSchema.safeParse({ password: rawPassword });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Password must be at least 8 characters",
    };
  }

  const { password } = parsed.data;
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase.auth.updateUser({ password });

  if (error) {
    return {
      success: false,
      error: error.message || "Failed to update password. Recovery link may have expired.",
    };
  }

  if (data.user) {
    await logAuditEvent({
      actorId: data.user.id,
      action: "auth:password_reset_completed",
      entity: "profiles",
      entityId: data.user.id,
    });
  }

  return {
    success: true,
    message: "Password updated successfully. You can now log in.",
  };
}
