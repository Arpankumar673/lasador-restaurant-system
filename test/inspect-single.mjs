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

const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function main() {
  console.log('Testing single table select on restaurant_settings...');
  const res = await client.from('restaurant_settings').select('*');
  console.log('Result status:', res.status, res.statusText);
  console.log('Result error:', res.error);
  console.log('Result data:', res.data);

  console.log('Testing profiles table...');
  const pRes = await client.from('profiles').select('*');
  console.log('Profiles result error:', pRes.error);
  console.log('Profiles data length:', pRes.data?.length);
  console.log('Profiles data:', pRes.data);
}

main().catch(console.error);
