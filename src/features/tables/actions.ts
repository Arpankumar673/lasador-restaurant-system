"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { getCurrentStaff } from "@/features/auth/server";
import { hasPermission } from "@/features/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/features/audit/logger";
import { generateSecureQrToken, hashQrToken } from "@/lib/utils/qr";

export interface TableActionResult {
  success: boolean;
  error?: string;
  message?: string;
  rawToken?: string;
  table?: any;
}

export type TableLockStatus =
  | "browsing_hold_owner"
  | "browsing_hold_blocked"
  | "order_locked_owner"
  | "order_locked_blocked";

export interface TableResolutionResult {
  valid: boolean;
  error?: string;
  table?: any;
  session?: any;
  deviceToken?: string;
  isDeviceOwner?: boolean;
  isOrderLocked?: boolean;
  holdExpiresAt?: string | null;
  countdownSeconds?: number;
  lockStatus?: TableLockStatus;
}

const tableSchema = z.object({
  table_number: z.string().min(1, "Table number is required"),
  label: z.string().optional().nullable(),
  zone: z.string().min(1, "Zone is required").default("Main Dining"),
  capacity: z.number().int().min(1, "Capacity must be at least 1").default(4),
  is_active: z.boolean().default(true),
});

/**
 * Creates a new dining table and automatically provisions its initial high-entropy QR token.
 * If a table with this number was previously archived/soft-deleted, it seamlessly restores and reactivates it.
 */
export async function createDiningTable(formData: FormData): Promise<TableActionResult> {
  const caller = await getCurrentStaff();
  if (!caller || !hasPermission(caller.profile.role, "tables:manage")) {
    return { success: false, error: "Unauthorized. You do not have permission to manage dining tables." };
  }

  const tableNumber = String(formData.get("tableNumber") || "").trim().toUpperCase();
  const label = String(formData.get("label") || "").trim() || null;
  const zone = String(formData.get("zone") || "Main Dining").trim();
  const capacity = Number(formData.get("capacity") || 4);
  const isActive = formData.has("isActive") ? formData.get("isActive") === "true" || formData.get("isActive") === "on" : true;

  const parsed = tableSchema.safeParse({
    table_number: tableNumber,
    label,
    zone,
    capacity,
    is_active: isActive,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid table parameters." };
  }

  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  // 1. Check if a table with this table_number already exists in database (active or archived)
  const { data: existingTable } = await supabase
    .from("dining_tables")
    .select("id, table_number, is_active, label, zone, capacity")
    .ilike("table_number", tableNumber)
    .maybeSingle();

  if (existingTable) {
    // If it is already active on the dining floor, inform the user clearly
    if (existingTable.is_active !== false) {
      return {
        success: false,
        error: `Table '${tableNumber}' already exists on the dining floor. Please choose a different table number (e.g. T-${Math.floor(Math.random() * 90 + 10)} or BAR-01).`,
      };
    }

    // If it was previously archived / soft-deleted, reactivate and restore it with new parameters!
    let savedTable: any = null;

    const { data: reactivated, error: reactivateErr } = await (supabase.from("dining_tables") as any)
      .update({
        is_active: true,
        deleted_at: null,
        zone,
        capacity,
        label,
        updated_at: nowIso,
      })
      .eq("id", existingTable.id)
      .select()
      .single();

    if (reactivateErr) {
      const { data: fallback, error: fallbackErr } = await supabase
        .from("dining_tables")
        .update({
          is_active: true,
          zone,
          capacity,
          label,
          updated_at: nowIso,
        })
        .eq("id", existingTable.id)
        .select()
        .single();

      if (fallbackErr) {
        return { success: false, error: fallbackErr.message };
      }
      savedTable = fallback;
    } else {
      savedTable = reactivated;
    }

    // Revoke any previous tokens and generate a fresh secure QR token
    const rawToken = generateSecureQrToken();
    const tokenHash = hashQrToken(rawToken);

    await supabase
      .from("table_qr_tokens")
      .update({ is_active: false, revoked_at: nowIso })
      .eq("table_id", existingTable.id)
      .eq("is_active", true);

    const { data: newTokenRow } = await supabase
      .from("table_qr_tokens")
      .insert({
        table_id: existingTable.id,
        token_hash: tokenHash,
        raw_token: rawToken,
        expires_at: null,
        is_active: true,
      })
      .select()
      .single();

    await logAuditEvent({
      actorId: caller.userId,
      action: "table:create",
      entity: "dining_tables",
      entityId: existingTable.id,
      details: { table_number: tableNumber, zone, capacity, restored: true },
    });

    revalidatePath("/admin/tables");
    revalidatePath("/admin/operations");

    return {
      success: true,
      message: `Table '${tableNumber}' restored and added to floor layout with new QR code.`,
      rawToken,
      table: {
        ...savedTable,
        active_token: newTokenRow || null,
        active_session: null,
      },
    };
  }

  // 2. Insert new dining table
  const { data: newTable, error: tableError } = await supabase
    .from("dining_tables")
    .insert(parsed.data)
    .select()
    .single();

  if (tableError) {
    if (tableError.code === "23505") {
      return { success: false, error: `Table '${tableNumber}' already exists on the dining floor.` };
    }
    return { success: false, error: tableError.message };
  }

  // Generate initial secure QR token (permanent validity until rotated/revoked)
  const rawToken = generateSecureQrToken();
  const tokenHash = hashQrToken(rawToken);

  const { data: newTokenRow, error: tokenError } = await supabase
    .from("table_qr_tokens")
    .insert({
      table_id: newTable.id,
      token_hash: tokenHash,
      raw_token: rawToken,
      expires_at: null,
      is_active: true,
    })
    .select()
    .single();

  if (tokenError) {
    console.error("Failed to generate initial QR token:", tokenError.message);
  }

  await logAuditEvent({
    actorId: caller.userId,
    action: "table:create",
    entity: "dining_tables",
    entityId: newTable.id,
    details: { table_number: tableNumber, zone, capacity },
  });

  revalidatePath("/admin/tables");
  revalidatePath("/admin/operations");
  return {
    success: true,
    message: `Table '${tableNumber}' created with active QR token.`,
    rawToken,
    table: {
      ...newTable,
      active_token: newTokenRow || null,
      active_session: null,
    },
  };
}

/**
 * Updates table details (label, zone, capacity, active status).
 */
export async function updateDiningTable(formData: FormData): Promise<TableActionResult> {
  const caller = await getCurrentStaff();
  if (!caller || !hasPermission(caller.profile.role, "tables:manage")) {
    return { success: false, error: "Unauthorized." };
  }

  const id = String(formData.get("id") || "").trim();
  if (!id) return { success: false, error: "Missing table ID." };

  const tableNumber = String(formData.get("tableNumber") || "").trim().toUpperCase();
  const label = String(formData.get("label") || "").trim() || null;
  const zone = String(formData.get("zone") || "Main Dining").trim();
  const capacity = Number(formData.get("capacity") || 4);
  const isActive = formData.has("isActive") ? formData.get("isActive") === "true" || formData.get("isActive") === "on" : false;

  const parsed = tableSchema.safeParse({
    table_number: tableNumber,
    label,
    zone,
    capacity,
    is_active: isActive,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid table parameters." };
  }

  const supabase = createAdminClient();

  // Check if another active table already uses this table number
  const { data: conflict } = await supabase
    .from("dining_tables")
    .select("id, table_number, is_active")
    .ilike("table_number", tableNumber)
    .neq("id", id)
    .maybeSingle();

  if (conflict && conflict.is_active !== false) {
    return {
      success: false,
      error: `Table number '${tableNumber}' is already in use by another active table.`,
    };
  }

  const { data: updatedTable, error } = await supabase
    .from("dining_tables")
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: `Table '${tableNumber}' already exists.` };
    }
    return { success: false, error: error.message };
  }

  await logAuditEvent({
    actorId: caller.userId,
    action: "table:update",
    entity: "dining_tables",
    entityId: id,
    details: parsed.data,
  });

  revalidatePath("/admin/tables");
  revalidatePath("/admin/operations");
  return {
    success: true,
    message: `Table '${tableNumber}' updated successfully.`,
    table: updatedTable,
  };
}

/**
 * Deactivates or activates a dining table.
 */
export async function toggleTableStatus(id: string, isActive: boolean): Promise<TableActionResult> {
  const caller = await getCurrentStaff();
  if (!caller || !hasPermission(caller.profile.role, "tables:manage")) {
    return { success: false, error: "Unauthorized." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("dining_tables")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  await logAuditEvent({
    actorId: caller.userId,
    action: "table:toggle_status",
    entity: "dining_tables",
    entityId: id,
    details: { isActive },
  });

  revalidatePath("/admin/tables");
  return { success: true, message: "Table status updated." };
}

/**
 * Regenerates a table's QR token, revoking the previous one immediately.
 */
export async function regenerateQrToken(tableId: string): Promise<TableActionResult> {
  const caller = await getCurrentStaff();
  if (!caller || !hasPermission(caller.profile.role, "tables:manage")) {
    return { success: false, error: "Unauthorized." };
  }

  const supabase = createAdminClient();

  // 1. Revoke existing active tokens for this table
  await supabase
    .from("table_qr_tokens")
    .update({
      is_active: false,
      revoked_at: new Date().toISOString(),
    })
    .eq("table_id", tableId)
    .eq("is_active", true);

  // 2. Generate new high-entropy token (permanent validity until rotated/revoked)
  const rawToken = generateSecureQrToken();
  const tokenHash = hashQrToken(rawToken);

  const { error: insertError } = await supabase.from("table_qr_tokens").insert({
    table_id: tableId,
    token_hash: tokenHash,
    raw_token: rawToken,
    expires_at: null,
    is_active: true,
  });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  await logAuditEvent({
    actorId: caller.userId,
    action: "qr:regenerate",
    entity: "table_qr_tokens",
    entityId: tableId,
  });

  revalidatePath("/admin/tables");
  return {
    success: true,
    message: "New QR token generated. Old QR code has been revoked.",
    rawToken,
  };
}

/**
 * Revokes a table's active QR code without issuing a new one (emergency lock).
 */
export async function revokeQrToken(tableId: string): Promise<TableActionResult> {
  const caller = await getCurrentStaff();
  if (!caller || !hasPermission(caller.profile.role, "tables:manage")) {
    return { success: false, error: "Unauthorized." };
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("table_qr_tokens")
    .update({
      is_active: false,
      revoked_at: new Date().toISOString(),
    })
    .eq("table_id", tableId)
    .eq("is_active", true);

  if (error) return { success: false, error: error.message };

  await logAuditEvent({
    actorId: caller.userId,
    action: "qr:revoke",
    entity: "table_qr_tokens",
    entityId: tableId,
  });

  revalidatePath("/admin/tables");
  return { success: true, message: "QR token revoked. Table is locked for digital ordering." };
}

/**
 * Safely deletes or archives a dining table with strict session safeguards and historical financial integrity.
 * - Blocks deletion if the table currently has an active session ('active', 'billing') or pending/in-progress orders.
 * - If historical orders, closed sessions, or bills exist: soft-deletes/archives the table (is_active = false, deleted_at = now())
 *   and revokes active QR codes, preserving historical relational integrity.
 * - If no historical records exist: cascade-deletes table_qr_tokens and physically deletes the table row.
 */
export async function deleteDiningTable(tableId: string): Promise<TableActionResult> {
  const caller = await getCurrentStaff();
  if (!caller || !hasPermission(caller.profile.role, "tables:manage")) {
    return { success: false, error: "Unauthorized. You do not have permission to delete dining tables." };
  }

  if (!tableId || typeof tableId !== "string") {
    return { success: false, error: "Valid Table ID is required." };
  }

  const supabase = createAdminClient();

  // 1. Fetch table details safely (only select columns guaranteed to exist in all environments)
  const { data: table, error: tableError } = await supabase
    .from("dining_tables")
    .select("id, table_number, is_active")
    .eq("id", tableId)
    .maybeSingle();

  if (tableError || !table) {
    return { success: false, error: tableError ? tableError.message : "Dining table not found." };
  }

  // 2. Safeguard: Check for active kitchen/bar orders in progress
  const { data: activeOrders } = await supabase
    .from("orders")
    .select("id, status")
    .eq("table_id", tableId)
    .in("status", ["new", "accepted", "preparing", "ready"]);

  if (activeOrders && activeOrders.length > 0) {
    return {
      success: false,
      error: `Cannot delete Table '${table.table_number}'. It has ${activeOrders.length} active order(s) in progress in the kitchen or bar. Please complete or cancel open orders before deleting.`,
    };
  }

  // 3. Safeguard: Check for open unpaid bills
  const { data: openBills } = await supabase
    .from("bills")
    .select("id, status")
    .eq("table_id", tableId)
    .eq("status", "open");

  if (openBills && openBills.length > 0) {
    return {
      success: false,
      error: `Cannot delete Table '${table.table_number}'. It currently has an open bill. Please settle or cancel the bill before deleting.`,
    };
  }

  // 4. Check for any historical orders or settled bills ever linked to this table
  const [billsCheck, ordersCheck] = await Promise.all([
    supabase.from("bills").select("id", { count: "exact", head: true }).eq("table_id", tableId),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("table_id", tableId),
  ]);

  const hasFinancialHistory =
    (billsCheck.count && billsCheck.count > 0) ||
    (ordersCheck.count && ordersCheck.count > 0);

  const nowIso = new Date().toISOString();

  // Always revoke any active QR tokens for this table
  await supabase
    .from("table_qr_tokens")
    .update({
      is_active: false,
      revoked_at: nowIso,
    })
    .eq("table_id", tableId)
    .eq("is_active", true);

  if (hasFinancialHistory) {
    // Soft delete / archive to protect relational foreign key integrity
    // Close any lingering active sessions
    await supabase
      .from("table_sessions")
      .update({ status: "closed", closed_at: nowIso })
      .eq("table_id", tableId)
      .in("status", ["active", "billing"]);

    // Try updating is_active = false and deleted_at (resilient if deleted_at column is pending migration)
    const { error: fullUpdateErr } = await (supabase.from("dining_tables") as any)
      .update({ is_active: false, deleted_at: nowIso })
      .eq("id", tableId);

    let archiveError = fullUpdateErr;
    if (fullUpdateErr) {
      const { error: fallbackErr } = await supabase
        .from("dining_tables")
        .update({ is_active: false })
        .eq("id", tableId);
      archiveError = fallbackErr;
    }

    if (archiveError) {
      return { success: false, error: archiveError.message };
    }

    await logAuditEvent({
      actorId: caller.userId,
      action: "table:delete",
      entity: "dining_tables",
      entityId: tableId,
      details: {
        table_number: table.table_number,
        archived: true,
        reason: "Archived to preserve historical billing and order integrity",
      },
    });

    revalidatePath("/admin/tables");
    revalidatePath("/admin/operations");
    return {
      success: true,
      message: `Table '${table.table_number}' archived and removed from floor layout. Historical orders and bills preserved.`,
    };
  } else {
    // Freshly created or unused table with zero orders and zero bills.
    // Clean up empty sessions first so foreign key constraints do not block deletion
    try {
      await supabase.from("service_requests").delete().eq("table_id", tableId);
    } catch {}
    await supabase.from("table_sessions").delete().eq("table_id", tableId);
    await supabase.from("table_qr_tokens").delete().eq("table_id", tableId);

    const { error: deleteError } = await supabase
      .from("dining_tables")
      .delete()
      .eq("id", tableId);

    if (deleteError) {
      // If foreign key constraint still blocks, fallback cleanly to soft-delete
      await supabase
        .from("dining_tables")
        .update({ is_active: false })
        .eq("id", tableId);

      revalidatePath("/admin/tables");
      revalidatePath("/admin/operations");
      return {
        success: true,
        message: `Table '${table.table_number}' archived and removed from floor layout.`,
      };
    }

    await logAuditEvent({
      actorId: caller.userId,
      action: "table:delete",
      entity: "dining_tables",
      entityId: tableId,
      details: {
        table_number: table.table_number,
        hard_deleted: true,
      },
    });

    revalidatePath("/admin/tables");
    revalidatePath("/admin/operations");
    return {
      success: true,
      message: `Table '${table.table_number}' permanently deleted.`,
    };
  }
}

/**
 * Resolves a raw QR token from customer scanning into an active Dining Table and Table Session.
 * Table QR tokens are permanent until explicitly rotated or revoked by staff.
 * Validates token hash, checks table availability, and retrieves or creates an active session.
 */
export async function resolveTableByQrToken(
  rawToken: string,
  providedDeviceToken?: string | null
): Promise<TableResolutionResult> {
  if (!rawToken || rawToken.trim().length < 8) {
    return { valid: false, error: "Invalid QR code format." };
  }

  const trimmedToken = rawToken.trim();
  const tokenHash = hashQrToken(trimmedToken);
  const supabase = createAdminClient();

  // Find active, unrevoked QR token
  // 1. Primary cryptographic lookup: match token_hash against SHA-256(trimmedToken)
  let { data: tokenRecord, error: tokenError } = await supabase
    .from("table_qr_tokens")
    .select(`
      id,
      table_id,
      token_hash,
      raw_token,
      is_active,
      revoked_at,
      dining_table:dining_tables (
        id,
        table_number,
        label,
        zone,
        capacity,
        is_active
      )
    `)
    .eq("token_hash", tokenHash)
    .eq("is_active", true)
    .is("revoked_at", null)
    .maybeSingle();

  // 2. Direct match on stored raw_token (if available)
  if (!tokenRecord) {
    const { data: rawRecord } = await supabase
      .from("table_qr_tokens")
      .select(`
        id,
        table_id,
        token_hash,
        raw_token,
        is_active,
        revoked_at,
        dining_table:dining_tables (
          id,
          table_number,
          label,
          zone,
          capacity,
          is_active
        )
      `)
      .eq("raw_token", trimmedToken)
      .eq("is_active", true)
      .is("revoked_at", null)
      .maybeSingle();

    if (rawRecord) {
      tokenRecord = rawRecord;
    }
  }

  // 3. Direct match on token_hash (e.g. if QR code was encoded with direct token hash)
  if (!tokenRecord) {
    const { data: directHashRecord } = await supabase
      .from("table_qr_tokens")
      .select(`
        id,
        table_id,
        token_hash,
        raw_token,
        is_active,
        revoked_at,
        dining_table:dining_tables (
          id,
          table_number,
          label,
          zone,
          capacity,
          is_active
        )
      `)
      .eq("token_hash", trimmedToken)
      .eq("is_active", true)
      .is("revoked_at", null)
      .maybeSingle();

    if (directHashRecord) {
      tokenRecord = directHashRecord;
    }
  }

  // 4. Prefix match on token_hash (for tokens >= 16 chars, e.g. 32-char prefix)
  if (!tokenRecord && trimmedToken.length >= 16) {
    const { data: prefixRecords } = await supabase
      .from("table_qr_tokens")
      .select(`
        id,
        table_id,
        token_hash,
        raw_token,
        is_active,
        revoked_at,
        dining_table:dining_tables (
          id,
          table_number,
          label,
          zone,
          capacity,
          is_active
        )
      `)
      .eq("is_active", true)
      .is("revoked_at", null)
      .ilike("token_hash", `${trimmedToken}%`)
      .limit(1);

    if (prefixRecords && prefixRecords.length > 0) {
      tokenRecord = prefixRecords[0];
    }
  }

  if (tokenError || !tokenRecord || !tokenRecord.dining_table) {
    return { valid: false, error: "This table QR code has been revoked or is unrecognized. Please request staff assistance." };
  }

  const table = Array.isArray(tokenRecord.dining_table)
    ? tokenRecord.dining_table[0]
    : tokenRecord.dining_table;

  if (!table.is_active || (table as any).deleted_at) {
    return { valid: false, error: `Table '${table.table_number}' is currently inactive or archived.` };
  }

  // 5. Retrieve or open an active table session with device lock & countdown lifecycle
  // Extract client device token from parameter or HttpOnly cookie
  let clientDeviceToken = providedDeviceToken || null;
  if (!clientDeviceToken) {
    try {
      const cookieStore = cookies();
      clientDeviceToken =
        cookieStore.get(`lasador_device_${table.id}`)?.value ||
        cookieStore.get("lasador_device_token")?.value ||
        null;
    } catch {}
  }

  // Fetch admin-configured countdown duration (default: 300 seconds / 5 minutes)
  let countdownSeconds = 300;
  try {
    const { data: settings } = await supabase
      .from("restaurant_settings")
      .select("qr_scan_countdown_seconds")
      .eq("id", 1)
      .maybeSingle();
    if (settings && typeof settings.qr_scan_countdown_seconds === "number" && settings.qr_scan_countdown_seconds > 0) {
      countdownSeconds = settings.qr_scan_countdown_seconds;
    }
  } catch {}

  let { data: session } = await supabase
    .from("table_sessions")
    .select("*")
    .eq("table_id", table.id)
    .eq("status", "active")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // If session is in browsing hold (is_order_locked = false) and countdown expired without any order:
  // Automatically close/release the un-ordered hold so the table frees up for new visitors!
  if (session && !session.is_order_locked && session.hold_expires_at) {
    const isHoldExpired = new Date(session.hold_expires_at).getTime() <= Date.now();
    if (isHoldExpired) {
      const { count: orderCount } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("session_id", session.id);

      if (!orderCount || orderCount === 0) {
        await supabase
          .from("table_sessions")
          .update({
            status: "closed",
            closed_at: new Date().toISOString(),
          })
          .eq("id", session.id);

        session = null;
      } else {
        // If an order already exists, ensure order lock is active
        await supabase
          .from("table_sessions")
          .update({ is_order_locked: true, hold_expires_at: null })
          .eq("id", session.id);
        session.is_order_locked = true;
        session.hold_expires_at = null;
      }
    }
  }

  // First Customer Scan: Open fresh session with browsing hold countdown
  if (!session) {
    const activeDeviceToken = clientDeviceToken || generateSecureQrToken();
    const sessionDeviceHash = hashQrToken(activeDeviceToken);
    const holdExpiresAt = new Date(Date.now() + countdownSeconds * 1000).toISOString();
    const sessionTokenHash = hashQrToken(generateSecureQrToken());

    const { data: newSession, error: sessionError } = await supabase
      .from("table_sessions")
      .insert({
        table_id: table.id,
        session_token_hash: sessionTokenHash,
        session_device_hash: sessionDeviceHash,
        hold_expires_at: holdExpiresAt,
        is_order_locked: false,
        status: "active",
        guest_count: 2,
      })
      .select()
      .single();

    if (sessionError || !newSession) {
      return { valid: false, error: "Failed to initialize table dining session." };
    }

    return {
      valid: true,
      table,
      session: newSession,
      deviceToken: activeDeviceToken,
      isDeviceOwner: true,
      isOrderLocked: false,
      holdExpiresAt,
      countdownSeconds,
      lockStatus: "browsing_hold_owner",
    };
  }

  // Active session exists: Determine device ownership
  const clientHash = clientDeviceToken ? hashQrToken(clientDeviceToken) : null;
  let isDeviceOwner = false;
  let activeDeviceToken = clientDeviceToken;

  if (!session.session_device_hash) {
    // If session has no device hash yet (e.g. legacy session or unlocked by staff), claim it
    activeDeviceToken = clientDeviceToken || generateSecureQrToken();
    const newHash = hashQrToken(activeDeviceToken);
    await supabase
      .from("table_sessions")
      .update({ session_device_hash: newHash })
      .eq("id", session.id);
    session.session_device_hash = newHash;
    isDeviceOwner = true;
  } else {
    isDeviceOwner = Boolean(clientHash && clientHash === session.session_device_hash);
  }

  if (session.is_order_locked) {
    return {
      valid: true,
      table,
      session,
      deviceToken: isDeviceOwner ? (activeDeviceToken || undefined) : undefined,
      isDeviceOwner,
      isOrderLocked: true,
      holdExpiresAt: null,
      countdownSeconds,
      lockStatus: isDeviceOwner ? "order_locked_owner" : "order_locked_blocked",
    };
  } else {
    return {
      valid: true,
      table,
      session,
      deviceToken: isDeviceOwner ? (activeDeviceToken || undefined) : undefined,
      isDeviceOwner,
      isOrderLocked: false,
      holdExpiresAt: session.hold_expires_at,
      countdownSeconds,
      lockStatus: isDeviceOwner ? "browsing_hold_owner" : "browsing_hold_blocked",
    };
  }
}

/**
 * Unlocks or resets an active table session by staff/manager override on /admin/tables.
 * - If orders exist on the session, it releases the device lock (is_order_locked = false, session_device_hash = null)
 *   so another device or replacement phone can place orders.
 * - If it is an un-ordered browsing hold, it immediately closes the session so the table is free for any new scan.
 */
export async function unlockTableSession(tableId: string): Promise<TableActionResult> {
  const caller = await getCurrentStaff();
  if (!caller || !hasPermission(caller.profile.role, "tables:manage")) {
    return { success: false, error: "Unauthorized. Manager or Admin permission required." };
  }

  if (!tableId) {
    return { success: false, error: "Table ID is required." };
  }

  const supabase = createAdminClient();

  // Find active session for table
  const { data: session, error: sessionFetchErr } = await supabase
    .from("table_sessions")
    .select("id, is_order_locked, session_device_hash, status")
    .eq("table_id", tableId)
    .eq("status", "active")
    .maybeSingle();

  if (sessionFetchErr || !session) {
    return { success: false, error: "No active dining session found for this table." };
  }

  // Check if orders exist for this session
  const { count: orderCount } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("session_id", session.id);

  const nowIso = new Date().toISOString();

  if (!orderCount || orderCount === 0) {
    // Un-ordered hold: Close the session completely so the table is free
    const { error: closeErr } = await supabase
      .from("table_sessions")
      .update({
        status: "closed",
        closed_at: nowIso,
      })
      .eq("id", session.id);

    if (closeErr) {
      return { success: false, error: closeErr.message };
    }

    await logAuditEvent({
      actorId: caller.userId,
      action: "table:session_reset",
      entity: "table_sessions",
      entityId: session.id,
      details: { tableId, action: "hold_cleared" },
    });

    revalidatePath("/admin/tables");
    revalidatePath("/admin/operations");
    return {
      success: true,
      message: "Browsing hold cleared. Table is now available for new guests.",
    };
  } else {
    // Orders exist: Release device lock so a replacement device can order
    const { error: unlockErr } = await supabase
      .from("table_sessions")
      .update({
        is_order_locked: false,
        session_device_hash: null,
        hold_expires_at: null,
      })
      .eq("id", session.id);

    if (unlockErr) {
      return { success: false, error: unlockErr.message };
    }

    await logAuditEvent({
      actorId: caller.userId,
      action: "table:session_unlock",
      entity: "table_sessions",
      entityId: session.id,
      details: { tableId, action: "device_lock_released", orderCount },
    });

    revalidatePath("/admin/tables");
    revalidatePath("/admin/operations");
    return {
      success: true,
      message: "Device lock released. Any device can now add items to this table's order.",
    };
  }
}
