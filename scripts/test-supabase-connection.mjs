import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Parse .env.local natively without external dependencies
function parseEnv(path) {
  const content = fs.readFileSync(path, "utf-8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      env[key] = val;
    }
  }
  return env;
}

const envConfig = parseEnv(".env.local");

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

console.log("=== Testing Supabase Connection ===");

// 1. URL validity
try {
  const parsed = new URL(supabaseUrl);
  console.log("Supabase URL Host:", parsed.hostname);
  console.log("URL Protocol:", parsed.protocol);
} catch (e) {
  console.error("Invalid Supabase URL:", e.message);
  process.exit(1);
}

// 2. Test Anon Key connection
console.log("\nTesting Anon Key Connection...");
const anonClient = createClient(supabaseUrl, supabaseAnonKey);
try {
  const { data, error } = await anonClient.auth.getSession();
  if (error) {
    console.log("Anon auth check returned error:", error.message);
  } else {
    console.log("Anon client connected successfully. Session status:", data?.session ? "active" : "none");
  }
} catch (err) {
  console.error("Anon client connection threw:", err.message);
}

// 3. Test Service Role Key connection (Server-side)
console.log("\nTesting Service Role Key Connection...");
const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

try {
  // Query Supabase Auth admin API
  const { data: users, error: authError } = await serviceClient.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (authError) {
    console.log("Service role auth check returned error:", authError.message);
  } else {
    console.log("Service role admin API connected successfully. User count check returned:", typeof users.users?.length);
  }

  // Check database REST endpoint
  const { data: dbData, error: dbError } = await serviceClient.from("restaurant_settings").select("count").limit(0);
  if (dbError) {
    console.log("Database table query status (expected if tables not yet created):", dbError.code, "-", dbError.message);
  } else {
    console.log("Database table query succeeded:", dbData);
  }
} catch (err) {
  console.error("Service role connection threw:", err.message);
}

console.log("\n=== Connection Test Complete ===");
