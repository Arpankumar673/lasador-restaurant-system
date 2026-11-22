import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "../../types/database.types";
import { getClientEnv } from "../validations/env";

/**
 * Creates a server Supabase client for Server Components, Server Actions, and Route Handlers.
 * Connects to L'Asador's dedicated Supabase project with user-scoped session credentials.
 */
export function createServerSupabaseClient() {
  const cookieStore = cookies();
  const env = getClientEnv();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Invoked from Server Component where cookies cannot be set directly;
            // middleware handles session refresh.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 });
          } catch {
            // Invoked from Server Component.
          }
        },
      },
    }
  );
}
