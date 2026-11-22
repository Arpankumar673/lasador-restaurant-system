import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../types/database.types";
import { getServerEnv } from "../validations/env";

/**
 * Creates an administrative Supabase client using the SUPABASE_SERVICE_ROLE_KEY.
 *
 * CRITICAL SECURITY CONSTRAINTS:
 * 1. This client MUST NEVER be imported, instantiated, or referenced in client-side code.
 * 2. It bypasses Row Level Security (RLS) in PostgreSQL.
 * 3. Use strictly for internal server background operations, webhooks, or controlled migrations.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error(
      "SECURITY VIOLATION: createAdminClient() invoked in a browser/client environment! The service role key must remain confidential."
    );
  }

  const env = getServerEnv();

  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
