import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Parse .env.local manually
const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx > -1) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('ERROR: Missing Supabase URL or Service Role Key in .env.local');
  process.exit(1);
}

const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } });
const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });

async function runAudit() {
  console.log('================================================================================');
  console.log('LIVE DATABASE SCHEMA & DATA AUDIT — L\'ASADOR (MOHALI)');
  console.log('Target URL:', url.replace(/(https:\/\/[^.]+).*/, '$1.supabase.co'));
  console.log('================================================================================\n');

  const tables = [
    'restaurant_settings', 'business_hours', 'tax_settings', 'staff_roles',
    'staff_permissions', 'profiles', 'categories', 'products', 'product_images',
    'product_variants', 'modifier_groups', 'modifiers', 'product_modifier_groups',
    'dining_tables', 'table_qr_tokens', 'table_sessions', 'orders', 'order_items',
    'order_item_modifiers', 'bills', 'payments', 'audit_logs'
  ];

  console.log('1. TABLE VERIFICATION (Admin / Service-Role Connection):');
  let tableSuccessCount = 0;
  for (const t of tables) {
    const { count, error } = await adminClient.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`[-] Table '${t}': MISSING OR ERROR: ${error.message}`);
    } else {
      console.log(`[+] Table '${t}': EXISTS (Row count: ${count})`);
      tableSuccessCount++;
    }
  }
  console.log(`\nTable Verification Summary: ${tableSuccessCount}/${tables.length} tables confirmed in live database.\n`);

  console.log('2. PUBLIC / ANON ACCESS & RLS AUDIT (Unauthenticated anon Client):');
  for (const t of tables) {
    const { data, count, error } = await anonClient.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`[+] Table '${t}': BLOCKED for anon (${error.message || error.code})`);
    } else {
      console.log(`[!] Table '${t}': ACCESSIBLE for anon (Rows visible: ${count})`);
    }
  }

  console.log('\n3. CRITICAL CONFIGURATION & SEED AUDIT:');
  const { data: restSettings, error: restErr } = await adminClient.from('restaurant_settings').select('*').limit(1);
  if (restErr) console.log('[-] restaurant_settings query error:', restErr.message);
  else console.log('[+] restaurant_settings:', restSettings?.[0] ? `Configured (${restSettings[0].name}, ${restSettings[0].city})` : 'EMPTY (Needs seed)');

  const { data: taxSettings } = await adminClient.from('tax_settings').select('*');
  console.log('[+] tax_settings count:', taxSettings?.length || 0, taxSettings?.map(t => `${t.name}: ${t.rate}%`));

  const { data: catData } = await adminClient.from('categories').select('id, name, slug');
  console.log('[+] categories count:', catData?.length || 0, catData?.map(c => c.name));

  const { data: prodData } = await adminClient.from('products').select('id, name, base_price, prep_station').limit(5);
  console.log('[+] products sample (first 5):', prodData);

  const { data: tableData } = await adminClient.from('dining_tables').select('id, table_number, zone, capacity');
  console.log('[+] dining_tables count:', tableData?.length || 0);

  const { data: profileData } = await adminClient.from('profiles').select('id, email, role, full_name, is_active');
  console.log('[+] profiles count:', profileData?.length || 0, profileData?.map(p => `${p.email || 'no-email'} (${p.role})`));

  const { data: rolesData } = await adminClient.from('staff_roles').select('*');
  console.log('[+] staff_roles count:', rolesData?.length || 0, rolesData?.map(r => r.role));
}

runAudit().catch(err => {
  console.error('Audit failed with uncaught exception:', err);
  process.exit(1);
});
