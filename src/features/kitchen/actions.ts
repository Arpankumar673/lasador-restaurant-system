"use server";

import { revalidatePath } from "next/cache";
import { getCurrentStaff } from "@/features/auth/server";
import { hasPermission } from "@/features/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/features/audit/logger";
import { ItemPrepStatus, OrderStatus, ItemStation } from "@/types/database.types";

export interface StationActionResult {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Updates the preparation status of an individual item in a station ticket.
 * Automatically synchronizes parent order status when all items reach readiness.
 */
export async function updateOrderItemStatus(
  orderItemId: string,
  newStatus: ItemPrepStatus
): Promise<StationActionResult> {
  const caller = await getCurrentStaff();
  if (!caller) {
    return { success: false, error: "Unauthorized. Staff authentication required." };
  }

  const supabase = createAdminClient();

  // 1. Fetch item to determine station and parent order
  const { data: item, error: fetchError } = await supabase
    .from("order_items")
    .select("id, order_id, station, product_name_snapshot, prep_status")
    .eq("id", orderItemId)
    .single();

  if (fetchError || !item) {
    return { success: false, error: "Ticket item not found." };
  }

  // 2. Validate permission based on station
  const isBarStation = item.station === "bar_taps" || item.station === "bar_cocktails";
  const requiredPermission = isBarStation ? "bar:update" : "kitchen:update";

  if (!hasPermission(caller.profile.role, requiredPermission)) {
    return {
      success: false,
      error: `Forbidden. Role '${caller.profile.role}' does not have '${requiredPermission}' permission.`,
    };
  }

  // 3. Update item status
  const { error: updateError } = await supabase
    .from("order_items")
    .update({
      prep_status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderItemId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // 4. Evaluate parent order status
  const { data: sisterItems } = await supabase
    .from("order_items")
    .select("prep_status")
    .eq("order_id", item.order_id);

  if (sisterItems && sisterItems.length > 0) {
    const statuses = sisterItems.map((i) => i.prep_status as ItemPrepStatus);
    let newOrderStatus: OrderStatus = "preparing";

    if (statuses.every((s) => s === "served" || s === "cancelled")) {
      newOrderStatus = "completed";
    } else if (statuses.every((s) => s === "ready" || s === "served" || s === "cancelled")) {
      newOrderStatus = "ready";
    } else if (statuses.some((s) => s === "preparing" || s === "ready")) {
      newOrderStatus = "preparing";
    } else if (statuses.every((s) => s === "pending")) {
      newOrderStatus = "accepted";
    }

    await supabase
      .from("orders")
      .update({
        status: newOrderStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.order_id);
  }

  // 5. Log audit trail
  await logAuditEvent({
    actorId: caller.userId,
    action: "item:status_update",
    entity: "order_items",
    entityId: orderItemId,
    details: {
      orderId: item.order_id,
      product: item.product_name_snapshot,
      previousStatus: item.prep_status,
      newStatus,
      station: item.station,
    },
  });

  revalidatePath("/kitchen");
  revalidatePath("/bar");
  revalidatePath("/admin/operations");
  return { success: true, message: `Item marked as ${newStatus}.` };
}

/**
 * Fetches active food orders and items for kitchen stations.
 */
export async function fetchKitchenTickets(stationFilter: string = "all_kitchen") {
  const supabase = createAdminClient();

  const kitchenStations: ItemStation[] =
    stationFilter === "all_kitchen"
      ? ["kitchen_grill", "kitchen_fry", "kitchen_pantry"]
      : [stationFilter as ItemStation];

  const { data: items, error } = await supabase
    .from("order_items")
    .select(`
      id,
      order_id,
      product_name_snapshot,
      variant_name_snapshot,
      unit_price_snapshot,
      quantity,
      station,
      prep_status,
      customer_notes,
      created_at,
      order:orders(
        id,
        order_number,
        status,
        special_notes,
        created_at,
        table:dining_tables(table_number, zone)
      ),
      order_item_modifiers(
        id,
        modifier_name_snapshot
      )
    `)
    .in("station", kitchenStations)
    .neq("prep_status", "served")
    .neq("prep_status", "cancelled")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching kitchen tickets:", error.message);
    return [];
  }

  return (items || []).map((item: any) => ({
    ...item,
    order: Array.isArray(item.order) ? item.order[0] : item.order,
    modifiers: item.order_item_modifiers || [],
  }));
}

/**
 * Fetches active beverage orders and items for bar stations.
 */
export async function fetchBarTickets(stationFilter: string = "all_bar") {
  const supabase = createAdminClient();

  const barStations: ItemStation[] =
    stationFilter === "all_bar"
      ? ["bar_taps", "bar_cocktails"]
      : [stationFilter as ItemStation];

  const { data: items, error } = await supabase
    .from("order_items")
    .select(`
      id,
      order_id,
      product_name_snapshot,
      variant_name_snapshot,
      unit_price_snapshot,
      quantity,
      station,
      prep_status,
      customer_notes,
      created_at,
      order:orders(
        id,
        order_number,
        status,
        special_notes,
        created_at,
        table:dining_tables(table_number, zone)
      ),
      order_item_modifiers(
        id,
        modifier_name_snapshot
      )
    `)
    .in("station", barStations)
    .neq("prep_status", "served")
    .neq("prep_status", "cancelled")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching bar tickets:", error.message);
    return [];
  }

  return (items || []).map((item: any) => ({
    ...item,
    order: Array.isArray(item.order) ? item.order[0] : item.order,
    modifiers: item.order_item_modifiers || [],
  }));
}
