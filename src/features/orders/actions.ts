"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/features/audit/logger";
import { resolveTableByQrToken } from "@/features/tables/actions";
import { ItemStation } from "@/types/database.types";
import {
  calculateLineSubtotal,
  calculateStatutoryGst,
  roundCurrency,
} from "@/lib/utils/currency";

export interface OrderItemSubmission {
  productId: string;
  variantId?: string | null;
  quantity: number;
  customerNotes?: string | null;
  selectedModifierIds: string[];
}

export interface CustomerOrderPayload {
  token: string;
  idempotencyKey: string;
  items: OrderItemSubmission[];
  specialInstructions?: string | null;
}

export interface OrderSubmissionResult {
  success: boolean;
  error?: string;
  orderId?: string;
  orderNumber?: string;
}

const orderItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional().nullable(),
  quantity: z.number().int().min(1).max(50),
  customerNotes: z.string().max(300).optional().nullable(),
  selectedModifierIds: z.array(z.string().uuid()).default([]),
});

const customerOrderSchema = z.object({
  token: z.string().min(10),
  idempotencyKey: z.string().min(10),
  items: z.array(orderItemSchema).min(1, "Order must contain at least one item"),
  specialInstructions: z.string().max(500).optional().nullable(),
});

/**
 * Submits a customer dine-in QR order atomically to the database.
 * Recomputes all prices on the server; never trusts client prices.
 */
export async function submitCustomerOrder(
  payload: CustomerOrderPayload
): Promise<OrderSubmissionResult> {
  const parsed = customerOrderSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid order submission payload.",
    };
  }

  const { token, idempotencyKey, items, specialInstructions } = parsed.data;

  // 1. Resolve table & session from QR token
  const resolution = await resolveTableByQrToken(token);
  if (!resolution.valid || !resolution.table || !resolution.session) {
    return { success: false, error: resolution.error || "Unable to verify table session." };
  }

  const { table, session } = resolution;
  const supabase = createAdminClient();

  // 2. Check Idempotency: Return existing order if key was already submitted
  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id, order_number")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existingOrder) {
    return {
      success: true,
      orderId: existingOrder.id,
      orderNumber: existingOrder.order_number,
    };
  }

  // 3. ATOMIC DATABASE RPC EXECUTION (F-03)
  // Calls PostgreSQL function to atomically validate, calculate, and insert
  // order + items + modifiers inside a single database transaction.
  const rpcPayload = {
    tableId: table.id,
    sessionId: session.id,
    idempotencyKey,
    specialInstructions: specialInstructions || null,
    items: items.map((i) => ({
      productId: i.productId,
      variantId: i.variantId || null,
      quantity: i.quantity,
      customerNotes: i.customerNotes || null,
      selectedModifierIds: i.selectedModifierIds || [],
    })),
  };

  const { data: rpcRaw, error: rpcError } = await supabase.rpc(
    "create_customer_order",
    { payload: rpcPayload }
  );

  if (!rpcError && rpcRaw) {
    const rpcData = rpcRaw as {
      success: boolean;
      order_id: string;
      order_number: string;
      total_amount: number;
      is_duplicate?: boolean;
    };

    if (rpcData.success) {
      await logAuditEvent({
        action: "order:customer_submit",
        entity: "orders",
        entityId: rpcData.order_id,
        details: {
          orderNumber: rpcData.order_number,
          tableNumber: table.table_number,
          totalAmount: rpcData.total_amount,
          itemCount: items.length,
          atomic: true,
          isDuplicate: rpcData.is_duplicate || false,
        },
      });

      revalidatePath("/admin/operations");
      revalidatePath("/admin/orders");
      revalidatePath("/kitchen");
      revalidatePath("/bar");

      return {
        success: true,
        orderId: rpcData.order_id,
        orderNumber: rpcData.order_number,
      };
    }
  }

  // If RPC failed due to validation or product unavailability, abort immediately
  if (
    rpcError &&
    !rpcError.message.includes("function public.create_customer_order") &&
    !rpcError.message.includes("could not find function") &&
    !rpcError.message.includes("does not exist")
  ) {
    return { success: false, error: rpcError.message };
  }

  // 4. Server-Side Fallback Price & Tax Calculation (F-05)
  const productIds = Array.from(new Set(items.map((i) => i.productId)));
  const modifierIds = Array.from(new Set(items.flatMap((i) => i.selectedModifierIds)));

  const [productsRes, variantsRes, modifiersRes] = await Promise.all([
    supabase.from("products").select("*").in("id", productIds),
    supabase.from("product_variants").select("*").in("product_id", productIds),
    modifierIds.length > 0
      ? supabase.from("modifiers").select("*").in("id", modifierIds)
      : Promise.resolve({ data: [] }),
  ]);

  const productMap = new Map((productsRes.data || []).map((p) => [p.id, p]));
  const variantMap = new Map((variantsRes.data || []).map((v) => [v.id, v]));
  const modifierMap = new Map(((modifiersRes.data as any[]) || []).map((m) => [m.id, m]));

  let calculatedSubtotal = 0;
  const preparedItems: {
    productId: string;
    variantId: string | null;
    productNameSnapshot: string;
    variantNameSnapshot: string | null;
    unitPriceSnapshot: number;
    quantity: number;
    subtotal: number;
    station: ItemStation;
    customerNotes: string | null;
    modifiers: {
      modifierId: string;
      modifierNameSnapshot: string;
      priceDeltaSnapshot: number;
    }[];
  }[] = [];

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product || !product.is_available) {
      return {
        success: false,
        error: `Item '${product?.name || "Selected item"}' is currently unavailable.`,
      };
    }

    let unitPrice = Number(product.base_price);
    let variantName: string | null = null;

    if (item.variantId) {
      const variant = variantMap.get(item.variantId);
      if (!variant || !variant.is_available) {
        return { success: false, error: `Portion variant for '${product.name}' is unavailable.` };
      }
      unitPrice = Number(variant.price);
      variantName = variant.name;
    }

    // Process Modifiers
    let modifierTotal = 0;
    const preparedModifiers: {
      modifierId: string;
      modifierNameSnapshot: string;
      priceDeltaSnapshot: number;
    }[] = [];

    for (const modId of item.selectedModifierIds) {
      const modifier = modifierMap.get(modId);
      if (modifier && modifier.is_available) {
        const delta = Number(modifier.price_delta);
        modifierTotal = roundCurrency(modifierTotal + delta);
        preparedModifiers.push({
          modifierId: modifier.id,
          modifierNameSnapshot: modifier.name,
          priceDeltaSnapshot: delta,
        });
      }
    }

    // Precise subtotal using paise currency utility
    const itemSubtotal = calculateLineSubtotal(unitPrice, modifierTotal, item.quantity);
    calculatedSubtotal += itemSubtotal;
    calculatedSubtotal = roundCurrency(calculatedSubtotal);

    preparedItems.push({
      productId: product.id,
      variantId: item.variantId || null,
      productNameSnapshot: product.name,
      variantNameSnapshot: variantName,
      unitPriceSnapshot: unitPrice,
      quantity: item.quantity,
      subtotal: itemSubtotal,
      station: product.station,
      customerNotes: item.customerNotes || null,
      modifiers: preparedModifiers,
    });
  }

  // Statutory 5% GST (2.5% CGST + 2.5% SGST: calculatedSubtotal * 0.025) using paise utility
  const { cgst, sgst, totalTax, grandTotal } = calculateStatutoryGst(calculatedSubtotal);

  // Generate unique order number
  const todayStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `ORD-${todayStr}-${randomSuffix}`;

  // 5. Insert Order Record
  const { data: newOrder, error: orderInsertError } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      table_id: table.id,
      session_id: session.id,
      status: "new",
      idempotency_key: idempotencyKey,
      subtotal: calculatedSubtotal,
      tax_total: totalTax,
      service_charge: 0.0,
      discount_total: 0.0,
      total_amount: grandTotal,
      special_notes: specialInstructions || null,
    })
    .select()
    .single();

  if (orderInsertError || !newOrder) {
    return { success: false, error: orderInsertError?.message || "Failed to create order record." };
  }

  // 6. Insert Order Items & Item Modifiers
  for (const prepItem of preparedItems) {
    const { data: insertedItem, error: itemError } = await supabase
      .from("order_items")
      .insert({
        order_id: newOrder.id,
        product_id: prepItem.productId,
        variant_id: prepItem.variantId,
        product_name_snapshot: prepItem.productNameSnapshot,
        variant_name_snapshot: prepItem.variantNameSnapshot,
        unit_price_snapshot: prepItem.unitPriceSnapshot,
        quantity: prepItem.quantity,
        subtotal: prepItem.subtotal,
        station: prepItem.station,
        prep_status: "pending",
        customer_notes: prepItem.customerNotes,
      })
      .select()
      .single();

    if (insertedItem && prepItem.modifiers.length > 0) {
      const modifierRows = prepItem.modifiers.map((m) => ({
        order_item_id: insertedItem.id,
        modifier_id: m.modifierId,
        modifier_name_snapshot: m.modifierNameSnapshot,
        price_delta_snapshot: m.priceDeltaSnapshot,
      }));
      await supabase.from("order_item_modifiers").insert(modifierRows);
    }
  }

  // 7. Log Audit Event
  await logAuditEvent({
    action: "order:customer_submit",
    entity: "orders",
    entityId: newOrder.id,
    details: {
      orderNumber,
      tableNumber: table.table_number,
      totalAmount: grandTotal,
      itemCount: items.length,
    },
  });

  // Revalidate operational dashboards
  revalidatePath("/kitchen");
  revalidatePath("/bar");
  revalidatePath("/admin/operations");
  revalidatePath(`/t/${token}/orders/${newOrder.id}`);

  return {
    success: true,
    orderId: newOrder.id,
    orderNumber,
  };
}

/**
 * Customers request the bill from their phone at the end of their meal.
 * Updates or creates a bill with status 'requested'.
 */
export async function requestTableBill(tableId: string, sessionId: string) {
  const supabase = createAdminClient();

  // Find existing bill for session or initialize one
  const { data: existingBill } = await supabase
    .from("bills")
    .select("id, status")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existingBill) {
    await supabase
      .from("bills")
      .update({
        status: "requested",
        requested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingBill.id);
  } else {
    // Generate bill from all orders in session
    const { data: sessionOrders } = await supabase
      .from("orders")
      .select("subtotal, tax_total, total_amount")
      .eq("session_id", sessionId)
      .neq("status", "cancelled");

    const subtotal = (sessionOrders || []).reduce((acc, o) => acc + Number(o.subtotal), 0);
    const taxTotal = (sessionOrders || []).reduce((acc, o) => acc + Number(o.tax_total), 0);
    const finalTotal = subtotal + taxTotal;

    const todayStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const billNumber = `BILL-${todayStr}-${randomSuffix}`;

    await supabase.from("bills").insert({
      bill_number: billNumber,
      session_id: sessionId,
      table_id: tableId,
      status: "requested",
      subtotal,
      cgst_amount: Number((subtotal * 0.025).toFixed(2)),
      sgst_amount: Number((subtotal * 0.025).toFixed(2)),
      final_total: finalTotal,
      requested_at: new Date().toISOString(),
    });
  }

  // Update session status to 'billing'
  await supabase
    .from("table_sessions")
    .update({ status: "billing", updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  revalidatePath("/admin/operations");
  revalidatePath("/admin/billing");
  return { success: true, message: "Bill requested. A server will assist you shortly." };
}

/**
 * Fetches order and item-level details for customer live tracking.
 */
export async function fetchCustomerOrderStatus(orderId: string) {
  const supabase = createAdminClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      status,
      subtotal,
      tax_total,
      total_amount,
      special_notes,
      created_at,
      table:dining_tables(table_number, zone),
      items:order_items(
        id,
        product_name_snapshot,
        variant_name_snapshot,
        unit_price_snapshot,
        quantity,
        subtotal,
        station,
        prep_status,
        customer_notes,
        modifiers:order_item_modifiers(
          id,
          modifier_name_snapshot,
          price_delta_snapshot
        )
      )
    `)
    .eq("id", orderId)
    .single();

  if (error || !order) return null;

  return {
    ...order,
    table: Array.isArray(order.table) ? order.table[0] : order.table,
  };
}
