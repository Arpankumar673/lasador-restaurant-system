import { z } from "zod";

/**
 * Client-accessible environment variables schema.
 * Only variables prefixed with NEXT_PUBLIC_ may be accessed in the browser.
 */
export const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid Supabase project URL (https://*.supabase.co)"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("NEXT_PUBLIC_APP_URL must be a valid URL")
    .optional()
    .default("http://localhost:3000"),
});

/**
 * Server-only environment variables schema.
 * Contains privileged secrets like SUPABASE_SERVICE_ROLE_KEY that MUST NEVER reach client code.
 */
export const serverEnvSchema = clientEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required for server administrative operations"),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Helper to safely validate environment variables.
 * Returns parsed object or structured error list.
 */
export function validateEnv() {
  const isServer = typeof window === "undefined";

  const clientVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  };

  const clientResult = clientEnvSchema.safeParse(clientVars);

  if (!isServer) {
    if (!clientResult.success) {
      console.warn("Client environment validation warnings:", clientResult.error.flatten().fieldErrors);
    }
    return {
      isValid: clientResult.success,
      errors: clientResult.success ? null : clientResult.error.flatten().fieldErrors,
      data: clientResult.success ? clientResult.data : null,
      isServer: false,
    };
  }

  const serverVars = {
    ...clientVars,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  const serverResult = serverEnvSchema.safeParse(serverVars);

  return {
    isValid: serverResult.success,
    errors: serverResult.success ? null : serverResult.error.flatten().fieldErrors,
    data: serverResult.success ? serverResult.data : null,
    isServer: true,
  };
}

/**
 * Returns validated client environment variables or fallback values with a console warning.
 */
export function getClientEnv(): ClientEnv {
  const result = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  });

  if (!result.success) {
    // If during build or initial boot before credentials are set, return non-crashing safe defaults
    return {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    };
  }

  return result.data;
}

/**
 * Returns validated server environment variables.
 * Guaranteed to throw on server if critical secrets are missing in production.
 */
export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("SECURITY VIOLATION: getServerEnv() called in browser context!");
  }

  const result = serverEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!result.success) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        `Critical server environment configuration error: ${JSON.stringify(result.error.flatten().fieldErrors)}`
      );
    }
    // Return dev placeholders to allow build and static generation
    return {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-role-key",
    };
  }

  return result.data;
}
