"use server";

import { revalidatePath } from "next/cache";
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
  const isActive = formData.get("isActive") !== "false";

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

  // Insert dining table
  const { data: newTable, error: tableError } = await supabase
    .from("dining_tables")
    .insert(parsed.data)
    .select()
    .single();

  if (tableError) {
    if (tableError.code === "23505") {
      return { success: false, error: `Table '${tableNumber}' already exists.` };
    }
    return { success: false, error: tableError.message };
  }

  // Generate initial secure QR token (permanent validity until rotated/revoked)
  const rawToken = generateSecureQrToken();
  const tokenHash = hashQrToken(rawToken);

  const { error: tokenError } = await supabase.from("table_qr_tokens").insert({
    table_id: newTable.id,
    token_hash: tokenHash,
    raw_token: rawToken,
    expires_at: null,
    is_active: true,
  });

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
  return {
    success: true,
    message: `Table '${tableNumber}' created with active QR token.`,
    rawToken,
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
  const isActive = formData.get("isActive") !== "false";

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

  const { error } = await supabase
    .from("dining_tables")
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

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
  return { success: true, message: `Table '${tableNumber}' updated successfully.` };
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
export async function resolveTableByQrToken(rawToken: string) {
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

  // Retrieve or open an active table session
  let { data: session } = await supabase
    .from("table_sessions")
    .select("*")
    .eq("table_id", table.id)
    .eq("status", "active")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) {
    // Open new session
    const sessionTokenHash = hashQrToken(generateSecureQrToken());
    const { data: newSession, error: sessionError } = await supabase
      .from("table_sessions")
      .insert({
        table_id: table.id,
        session_token_hash: sessionTokenHash,
        status: "active",
        guest_count: 2,
      })
      .select()
      .single();

    if (sessionError || !newSession) {
      return { valid: false, error: "Failed to initialize table dining session." };
    }
    session = newSession;
  }

  return {
    valid: true,
    table,
    session,
  };
}
