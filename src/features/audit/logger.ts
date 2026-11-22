import { createAdminClient } from "@/lib/supabase/admin";
import { Json } from "@/types/database.types";

export interface LogAuditParams {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

/**
 * Sanitizes metadata to ensure sensitive fields (passwords, tokens, keys)
 * are NEVER written into the immutable audit trail.
 */
function sanitizeAuditDetails(details?: Record<string, unknown> | null): Json | null {
  if (!details) return null;

  const sanitized: Record<string, unknown> = {};
  const sensitiveKeys = ["password", "token", "secret", "anon_key", "service_role", "hash"];

  for (const [key, value] of Object.entries(details)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as Json;
}

/**
 * Records an immutable administrative audit log entry in the database.
 * Uses the server-side admin client to ensure trusted write access.
 */
export async function logAuditEvent({
  actorId = null,
  action,
  entity,
  entityId = null,
  details = null,
  ipAddress = null,
}: LogAuditParams): Promise<void> {
  try {
    const adminSupabase = createAdminClient();
    const sanitizedDetails = sanitizeAuditDetails(details);

    const { error } = await adminSupabase.from("audit_logs").insert({
      actor_id: actorId,
      action,
      entity,
      entity_id: entityId,
      details: sanitizedDetails,
      ip_address: ipAddress,
    });

    if (error) {
      console.error("Failed to write audit log entry:", error.message);
    }
  } catch (err) {
    console.error("Audit logging error:", err);
  }
}
