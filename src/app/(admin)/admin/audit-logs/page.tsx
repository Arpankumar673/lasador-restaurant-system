import { requirePermission } from "@/features/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AuditLogsView, AuditLogEntry } from "@/features/audit/components/audit-logs-view";

export default async function AuditLogsPage() {
  await requirePermission("audit:view");

  const supabase = createAdminClient();

  // Fetch chronological audit logs with actor profile join
  const { data: rawLogs, error } = await supabase
    .from("audit_logs")
    .select(`
      id,
      actor_id,
      action,
      entity,
      entity_id,
      details,
      ip_address,
      created_at,
      actor:profiles (
        id,
        full_name,
        email,
        role
      )
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Error retrieving audit log trail:", error.message);
  }

  // Typecast payload details safely
  const logs: AuditLogEntry[] = (rawLogs || []).map((row) => ({
    id: row.id,
    actor_id: row.actor_id,
    action: row.action,
    entity: row.entity,
    entity_id: row.entity_id,
    details: (row.details as Record<string, unknown>) || null,
    ip_address: row.ip_address,
    created_at: row.created_at,
    actor: Array.isArray(row.actor) ? row.actor[0] : row.actor,
  }));

  return <AuditLogsView initialLogs={logs} />;
}
