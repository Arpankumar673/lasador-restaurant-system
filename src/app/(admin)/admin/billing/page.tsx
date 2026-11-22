import { requirePermission } from "@/features/auth/server";
import { hasPermission } from "@/features/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchBills } from "@/features/billing/actions";
import { BillingView } from "@/features/billing/components/billing-view";

export default async function AdminBillingPage() {
  const currentStaff = await requirePermission("bills:view");
  const canSettle = hasPermission(currentStaff.profile.role, "bills:settle");

  const supabase = createAdminClient();

  const [bills, sessionsRes] = await Promise.all([
    fetchBills("all"),
    supabase
      .from("table_sessions")
      .select(`
        id,
        table_id,
        table:dining_tables(table_number, zone)
      `)
      .in("status", ["active", "billing"]),
  ]);

  const activeSessions = (sessionsRes.data || []).map((s: any) => ({
    id: s.id,
    table_id: s.table_id,
    table_number: s.table?.table_number || "T-01",
    zone: s.table?.zone || "Dining",
  }));

  return (
    <BillingView
      initialBills={bills as any}
      activeSessions={activeSessions}
      canSettle={canSettle}
    />
  );
}
