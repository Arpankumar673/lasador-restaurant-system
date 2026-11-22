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

async function checkAuth() {
  console.log('Testing Supabase Auth Admin API (listUsers)...');
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) {
    console.error('Auth Admin error:', error);
  } else {
    console.log('Auth Users found:', data.users.length);
    data.users.forEach(u => console.log('User:', u.id, u.email, u.created_at));
  }
}

checkAuth().catch(console.error);
