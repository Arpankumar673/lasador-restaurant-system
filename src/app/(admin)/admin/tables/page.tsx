import { requirePermission } from "@/features/auth/server";
import { hasPermission } from "@/features/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { TableManagementView, FullTable } from "@/features/tables/components/table-management-view";

export default async function AdminTablesPage() {
  const currentStaff = await requirePermission("tables:view");
  const canManage = hasPermission(currentStaff.profile.role, "tables:manage");

  const supabase = createAdminClient();

  // Fetch dining tables, active QR tokens, and active sessions
  const [tablesRes, tokensRes, sessionsRes] = await Promise.all([
    supabase.from("dining_tables").select("*").is("deleted_at", null).order("table_number", { ascending: true }),
    supabase.from("table_qr_tokens").select("*").eq("is_active", true),
    supabase.from("table_sessions").select("*").eq("status", "active"),
  ]);

  if (tablesRes.error) {
    console.error("Error fetching tables:", tablesRes.error.message);
  }

  const activeTokensMap = new Map((tokensRes.data || []).map((t) => [t.table_id, t]));
  const activeSessionsMap = new Map((sessionsRes.data || []).map((s) => [s.table_id, s]));

  const fullTables: FullTable[] = (tablesRes.data || []).map((t) => ({
    ...t,
    active_token: activeTokensMap.get(t.id) || null,
    active_session: activeSessionsMap.get(t.id) || null,
  }));

  return <TableManagementView initialTables={fullTables} canManage={canManage} />;
}
