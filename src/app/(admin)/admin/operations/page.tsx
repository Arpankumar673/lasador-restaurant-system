import { requirePermission } from "@/features/auth/server";
import { hasPermission } from "@/features/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { OperationsView, OperationsOrder } from "@/features/dashboard/components/operations-view";

export default async function OperationsPage() {
  const currentStaff = await requirePermission("orders:view");
  const canManage = hasPermission(currentStaff.profile.role, "orders:manage");

  const supabase = createAdminClient();

  // Fetch orders, dining tables, and active sessions
  const [ordersRes, tablesRes, sessionsRes] = await Promise.all([
    supabase
      .from("orders")
      .select(`
        id,
        order_number,
        status,
        subtotal,
        tax_total,
        total_amount,
        special_notes,
        session_id,
        created_at,
        table:dining_tables(id, table_number, zone),
        items:order_items(
          id,
          product_name_snapshot,
          variant_name_snapshot,
          quantity,
          subtotal,
          station,
          prep_status,
          customer_notes
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("dining_tables").select("id, is_active"),
    supabase.from("table_sessions").select("id").eq("status", "active"),
  ]);

  if (ordersRes.error) {
    console.error("Error fetching operations orders:", ordersRes.error.message);
  }

  const rawOrders = (ordersRes.data as unknown[]) || [];
  const orders: OperationsOrder[] = rawOrders.map((o: any) => ({
    ...o,
    table: Array.isArray(o.table) ? o.table[0] : o.table,
    items: o.items || [],
  }));

  const totalTablesCount = (tablesRes.data || []).length;
  const occupiedTablesCount = (sessionsRes.data || []).length;

  return (
    <OperationsView
      initialOrders={orders}
      totalTablesCount={totalTablesCount}
      occupiedTablesCount={occupiedTablesCount}
      canManage={canManage}
    />
  );
}
