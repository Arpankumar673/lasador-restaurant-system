import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "../../types/database.types";
import { getClientEnv } from "../validations/env";

/**
 * Creates a singleton browser Supabase client for client-side React components.
 * Uses public anon key and connects to L'Asador's dedicated Supabase project.
 */
let clientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (clientInstance) return clientInstance;

  const env = getClientEnv();

  clientInstance = createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  return clientInstance;
}
