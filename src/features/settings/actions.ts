"use server";

import { revalidatePath } from "next/cache";
import { getCurrentStaff } from "@/features/auth/server";
import { hasPermission } from "@/features/auth/permissions";
import { restaurantSettingsSchema } from "@/lib/validations/restaurant";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/features/audit/logger";

export interface SettingsActionResult {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Updates singleton restaurant settings row (id = 1).
 * Requires Owner or Admin authorization.
 */
export async function updateRestaurantSettings(formData: FormData): Promise<SettingsActionResult> {
  const caller = await getCurrentStaff();
  if (!caller) {
    return { success: false, error: "Unauthorized. Authentication required." };
  }

  if (!hasPermission(caller.profile.role, "settings:manage")) {
    return { success: false, error: "Forbidden. You do not have permission to modify settings." };
  }

  const rawData = {
    name: formData.get("name"),
    tagline: formData.get("tagline") || null,
    description: formData.get("description") || null,
    address_line1: formData.get("address_line1"),
    address_line2: formData.get("address_line2") || null,
    city: formData.get("city"),
    state: formData.get("state"),
    pincode: formData.get("pincode"),
    country: formData.get("country") || "India",
    phone: formData.get("phone"),
    email: formData.get("email"),
    gst_number: formData.get("gst_number") || null,
    fssai_license: formData.get("fssai_license") || null,
    currency: formData.get("currency") || "INR",
    currency_symbol: formData.get("currency_symbol") || "₹",
    timezone: formData.get("timezone") || "Asia/Kolkata",
    is_ordering_enabled: formData.get("is_ordering_enabled") === "true",
    qr_scan_countdown_seconds: formData.get("qr_scan_countdown_seconds")
      ? Number(formData.get("qr_scan_countdown_seconds"))
      : 300,
  };

  const parsed = restaurantSettingsSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid settings input",
    };
  }

  const adminSupabase = createAdminClient();

  const { error: updateError } = await adminSupabase
    .from("restaurant_settings")
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  await logAuditEvent({
    actorId: caller.userId,
    action: "settings:update",
    entity: "restaurant_settings",
    entityId: "1",
    details: parsed.data,
  });

  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { success: true, message: "Restaurant configuration updated successfully." };
}
