"use server";

import { revalidatePath } from "next/cache";
import { getCurrentStaff } from "@/features/auth/server";
import { hasPermission } from "@/features/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/features/audit/logger";

export interface OperationsActionResult {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Accepts a new customer order from floor manager console.
 * Sets order status to 'accepted'.
 */
export async function acceptOrder(orderId: string): Promise<OperationsActionResult> {
  const caller = await getCurrentStaff();
  if (!caller || !hasPermission(caller.profile.role, "orders:manage")) {
    return { success: false, error: "Unauthorized. Permission 'orders:manage' required." };
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("orders")
    .update({
      status: "accepted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) return { success: false, error: error.message };

  await logAuditEvent({
    actorId: caller.userId,
    action: "order:accept",
    entity: "orders",
    entityId: orderId,
  });

  revalidatePath("/admin/operations");
  revalidatePath("/admin/orders");
  revalidatePath("/kitchen");
  revalidatePath("/bar");
  return { success: true, message: "Order accepted and queued for stations." };
}

/**
 * Cancels an order with an authorized mandatory cancellation reason.
 */
export async function cancelOrder(
  orderId: string,
  reason: string
): Promise<OperationsActionResult> {
  const caller = await getCurrentStaff();
  if (!caller || !hasPermission(caller.profile.role, "orders:manage")) {
    return { success: false, error: "Unauthorized." };
  }

  if (!reason || reason.trim().length < 3) {
    return { success: false, error: "A valid cancellation reason is required." };
  }

  const supabase = createAdminClient();

  // Cancel order
  const { error: orderError } = await supabase
    .from("orders")
    .update({
      status: "cancelled",
      special_notes: `[CANCELLED: ${reason.trim()}]`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (orderError) return { success: false, error: orderError.message };

  // Cancel unserved items
  await supabase
    .from("order_items")
    .update({
      prep_status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("order_id", orderId)
    .neq("prep_status", "served");

  await logAuditEvent({
    actorId: caller.userId,
    action: "order:cancel",
    entity: "orders",
    entityId: orderId,
    details: { reason },
  });

  revalidatePath("/admin/operations");
  revalidatePath("/admin/orders");
  revalidatePath("/kitchen");
  revalidatePath("/bar");
  return { success: true, message: "Order cancelled." };
}

/**
 * Closes an active table session (after dining and settlement).
 */
export async function closeTableSession(sessionId: string): Promise<OperationsActionResult> {
  const caller = await getCurrentStaff();
  if (!caller || !hasPermission(caller.profile.role, "tables:manage")) {
    return { success: false, error: "Unauthorized." };
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("table_sessions")
    .update({
      status: "closed",
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) return { success: false, error: error.message };

  await logAuditEvent({
    actorId: caller.userId,
    action: "session:close",
    entity: "table_sessions",
    entityId: sessionId,
  });

  revalidatePath("/admin/operations");
  revalidatePath("/admin/tables");
  return { success: true, message: "Table session closed and table released." };
}
