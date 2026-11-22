import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx > -1) {
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[trimmed.slice(0, idx).trim()] = val;
    }
  }
});

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

async function check() {
  const tables = ['restaurant_settings', 'profiles', 'categories', 'products', 'dining_tables'];
  for (const t of tables) {
    const aRes = await admin.from(t).select('*').limit(1);
    console.log(`Table ${t} (service_role): status = ${aRes.status}, error = ${aRes.error?.code}: ${aRes.error?.message}`);
    const nRes = await anon.from(t).select('*').limit(1);
    console.log(`Table ${t} (anon): status = ${nRes.status}, error = ${nRes.error?.code}: ${nRes.error?.message}`);
  }
}

check().catch(console.error);
