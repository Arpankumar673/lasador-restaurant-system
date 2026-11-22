"use server";

import { revalidatePath } from "next/cache";
import { getCurrentStaff } from "@/features/auth/server";
import { hasPermission } from "@/features/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/features/audit/logger";
import { PaymentMethod, BillStatus } from "@/types/database.types";
import {
  calculateStatutoryGst,
  evaluatePayment,
  roundCurrency,
} from "@/lib/utils/currency";

export interface BillingActionResult {
  success: boolean;
  error?: string;
  message?: string;
  billId?: string;
}

/**
 * Fetches all bills and associated payments with table information.
 */
export async function fetchBills(statusFilter: string = "all") {
  const supabase = createAdminClient();

  let query = supabase
    .from("bills")
    .select(`
      id,
      bill_number,
      session_id,
      table_id,
      status,
      subtotal,
      cgst_amount,
      sgst_amount,
      service_charge,
      discount_amount,
      final_total,
      amount_paid,
      balance_remaining,
      requested_at,
      settled_at,
      settled_by,
      created_at,
      table:dining_tables(table_number, zone),
      payments(
        id,
        payment_method,
        status,
        amount,
        transaction_reference,
        created_at
      )
    `)
    .order("created_at", { ascending: false });

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter as BillStatus);
  }

  const { data: bills, error } = await query;
  if (error) {
    console.error("Error fetching bills:", error.message);
    return [];
  }

  return (bills || []).map((b) => ({
    ...b,
    table: Array.isArray(b.table) ? b.table[0] : b.table,
    payments: b.payments || [],
  }));
}

/**
 * Generates an official statutory bill for an active table session.
 */
export async function generateBillForTable(
  tableId: string,
  sessionId: string
): Promise<BillingActionResult> {
  const caller = await getCurrentStaff();
  if (!caller || !hasPermission(caller.profile.role, "bills:settle")) {
    return { success: false, error: "Unauthorized. Permission 'bills:settle' required." };
  }

  const supabase = createAdminClient();

  // Find all active orders for this table session
  const { data: sessionOrders, error: orderError } = await supabase
    .from("orders")
    .select("subtotal, tax_total, total_amount")
    .eq("session_id", sessionId)
    .neq("status", "cancelled");

  if (orderError || !sessionOrders || sessionOrders.length === 0) {
    return { success: false, error: "No completed or active orders found for this dining session." };
  }

  const subtotal = roundCurrency(
    sessionOrders.reduce((acc, o) => acc + Number(o.subtotal), 0)
  );
  const { cgst, sgst, grandTotal: finalTotal } = calculateStatutoryGst(subtotal);

  const todayStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const billNumber = `BILL-${todayStr}-${randomSuffix}`;

  const { data: newBill, error: billError } = await supabase
    .from("bills")
    .insert({
      bill_number: billNumber,
      session_id: sessionId,
      table_id: tableId,
      status: "open",
      subtotal,
      cgst_amount: cgst,
      sgst_amount: sgst,
      service_charge: 0.0,
      discount_amount: 0.0,
      final_total: finalTotal,
      amount_paid: 0.0,
      balance_remaining: finalTotal,
    })
    .select()
    .single();

  if (billError || !newBill) {
    return { success: false, error: billError?.message || "Failed to generate bill." };
  }

  await logAuditEvent({
    actorId: caller.userId,
    action: "bill:generate",
    entity: "bills",
    entityId: newBill.id,
    details: { billNumber, subtotal, finalTotal },
  });

  revalidatePath("/admin/billing");
  revalidatePath("/admin/operations");
  return { success: true, message: `Bill ${billNumber} generated.`, billId: newBill.id };
}

/**
 * Records a verified payment and settles a customer bill.
 * Supports split / partial payments across multiple tenders (Cash, UPI, Card, POS).
 * Closes the table session and releases the table ONLY when balance reaches zero.
 */
export async function recordBillPayment(formData: FormData): Promise<BillingActionResult> {
  const caller = await getCurrentStaff();
  if (!caller || !hasPermission(caller.profile.role, "bills:settle")) {
    return { success: false, error: "Unauthorized. Permission 'bills:settle' required." };
  }

  const billId = String(formData.get("billId") || "").trim();
  const paymentMethod = (formData.get("paymentMethod") as PaymentMethod) || "cash";
  const amount = roundCurrency(Number(formData.get("amount") || 0));
  const transactionRef = String(formData.get("transactionRef") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!billId) return { success: false, error: "Missing bill ID." };
  if (amount <= 0) return { success: false, error: "Payment amount must be greater than zero." };

  const supabase = createAdminClient();

  // 1. ATOMIC DATABASE RPC EXECUTION (F-02 & F-05)
  // Invokes PostgreSQL stored procedure with row-level FOR UPDATE locking.
  // Prevents concurrent race conditions and validates balance atomicity.
  const { data: rpcRaw, error: rpcError } = await supabase.rpc(
    "record_bill_payment_atomic",
    {
      p_bill_id: billId,
      p_payment_method: paymentMethod,
      p_amount: amount,
      p_transaction_ref: transactionRef,
      p_collected_by: caller.userId,
      p_notes: notes,
    }
  );

  if (!rpcError && rpcRaw) {
    const res = rpcRaw as {
      success: boolean;
      payment_id: string;
      bill_number: string;
      amount_paid: number;
      balance_remaining: number;
      is_settled: boolean;
      status: BillStatus;
    };

    if (res.is_settled) {
      await logAuditEvent({
        actorId: caller.userId,
        action: "payment:settle",
        entity: "bills",
        entityId: billId,
        details: {
          billNumber: res.bill_number,
          paymentMethod,
          amountPaid: amount,
          cumulativePaid: res.amount_paid,
          balanceRemaining: res.balance_remaining,
          isSettled: true,
          transactionRef,
        },
      });
    } else {
      await logAuditEvent({
        actorId: caller.userId,
        action: "payment:partial_record",
        entity: "bills",
        entityId: billId,
        details: {
          billNumber: res.bill_number,
          paymentMethod,
          amountPaid: amount,
          cumulativePaid: res.amount_paid,
          balanceRemaining: res.balance_remaining,
          isSettled: false,
          transactionRef,
        },
      });
    }

    revalidatePath("/admin/billing");
    revalidatePath("/admin/operations");
    revalidatePath("/admin/tables");
    revalidatePath("/admin/analytics");

    const message = res.is_settled
      ? `Bill ${res.bill_number} settled in full via ${paymentMethod}. Table released.`
      : `Partial payment of ₹${amount.toFixed(2)} recorded via ${paymentMethod}. Balance remaining: ₹${Number(
          res.balance_remaining
        ).toFixed(2)}.`;

    return { success: true, message, billId };
  }

  // If RPC rejected payment due to overpayment or status constraint, return error
  if (
    rpcError &&
    !rpcError.message.includes("record_bill_payment_atomic") &&
    !rpcError.message.includes("could not find function") &&
    !rpcError.message.includes("does not exist")
  ) {
    return { success: false, error: rpcError.message };
  }

  // 2. Fallback Application-Level Settlement with Strict Currency Precision
  const { data: bill, error: billFetchError } = await supabase
    .from("bills")
    .select("id, bill_number, session_id, final_total, amount_paid, balance_remaining, status")
    .eq("id", billId)
    .single();

  if (billFetchError || !bill) {
    return { success: false, error: "Target bill record not found." };
  }

  if (bill.status === "settled") {
    return { success: false, error: "Bill is already settled." };
  }

  const alreadyPaid = Number(bill.amount_paid || 0);
  const finalTotal = Number(bill.final_total || 0);

  const paymentEval = evaluatePayment(finalTotal, alreadyPaid, amount);
  if (!paymentEval.isValid) {
    return { success: false, error: paymentEval.error };
  }

  // Insert payment record
  const { error: paymentError } = await supabase.from("payments").insert({
    bill_id: billId,
    payment_method: paymentMethod,
    status: "completed",
    amount,
    transaction_reference: transactionRef,
    collected_by: caller.userId,
    notes,
  });

  if (paymentError) {
    return { success: false, error: paymentError.message };
  }

  // Update bill with new cumulative amount paid and balance remaining
  const newStatus: BillStatus = paymentEval.isFullySettled ? "settled" : "partially_paid";
  const { error: billUpdateError } = await supabase
    .from("bills")
    .update({
      amount_paid: paymentEval.newAmountPaid,
      balance_remaining: paymentEval.balanceRemaining,
      status: newStatus,
      settled_at: paymentEval.isFullySettled ? new Date().toISOString() : null,
      settled_by: paymentEval.isFullySettled ? caller.userId : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", billId);

  if (billUpdateError) {
    return { success: false, error: billUpdateError.message };
  }

  // Close dining session ONLY IF fully settled
  if (paymentEval.isFullySettled && bill.session_id) {
    await supabase
      .from("table_sessions")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", bill.session_id);
  }

  if (paymentEval.isFullySettled) {
    await logAuditEvent({
      actorId: caller.userId,
      action: "payment:settle",
      entity: "bills",
      entityId: billId,
      details: {
        billNumber: bill.bill_number,
        paymentMethod,
        amountSettled: amount,
        cumulativePaid: paymentEval.newAmountPaid,
        balanceRemaining: paymentEval.balanceRemaining,
        isFullySettled: true,
        transactionRef,
      },
    });
  } else {
    await logAuditEvent({
      actorId: caller.userId,
      action: "payment:partial_record",
      entity: "bills",
      entityId: billId,
      details: {
        billNumber: bill.bill_number,
        paymentMethod,
        amountSettled: amount,
        cumulativePaid: paymentEval.newAmountPaid,
        balanceRemaining: paymentEval.balanceRemaining,
        isFullySettled: false,
        transactionRef,
      },
    });
  }

  revalidatePath("/admin/billing");
  revalidatePath("/admin/operations");
  revalidatePath("/admin/tables");
  revalidatePath("/admin/analytics");

  const message = paymentEval.isFullySettled
    ? `Bill ${bill.bill_number} settled in full via ${paymentMethod}. Table session closed.`
    : `Partial payment of ₹${amount.toFixed(2)} recorded via ${paymentMethod}. Balance remaining: ₹${paymentEval.balanceRemaining.toFixed(
        2
      )}.`;

  return { success: true, message };
}
