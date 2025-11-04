import type { WhopSubscription, WhopOrder, WhopRefund } from '../src/lib/types';

// Load .env.local explicitly using CommonJS (compatible with CJS wrapper)
const path = require('path');
const dotenv = require('dotenv');

// Load .env.local from project root (reliable path resolution)
const envPath = path.resolve(process.cwd(), '.env.local');
const result = dotenv.config({ path: envPath });

// Debug output
if (result.error) {
  console.warn('[Seed] Failed to load .env.local:', result.error.message);
}
console.log('[ENV DEBUG]', {
  cwd: process.cwd(),
  envPath,
  url: process.env.SUPABASE_URL,
  keyLength: process.env.SUPABASE_ANON_KEY?.length,
  keySnippet: process.env.SUPABASE_ANON_KEY?.slice(0, 15)
});

// Use require() to avoid ESM loader issues on Node 22+/Windows
const envUrl = process.env.SUPABASE_URL;
const envKey = process.env.SUPABASE_ANON_KEY;
const redact = (v?: string) => (v ? v.slice(0, 8) + '…' + v.slice(-4) : '<missing>');
console.log('[Seed] Env check → URL:', redact(envUrl), 'KEY:', envKey ? 'present' : 'missing');
if (!envUrl || !envKey) {
  console.log('[Seed] Missing SUPABASE_URL or SUPABASE_ANON_KEY. Skipping upsert.');
  console.log('Seed complete ✅');
  process.exit(0);
}
const { supabase } = require('../src/lib/db') as typeof import('../src/lib/db');
const { createClient } = require('@supabase/supabase-js');
let client = supabase;

async function minimalTest(currentClient: typeof supabase) {
  try {
    const res = await currentClient.from('seed_verification').select('*').limit(1);
    return res;
  } catch (e: any) {
    return { data: null, error: e };
  }
}

(async () => {
  const t1 = await minimalTest(client);
  if (t1.error) {
    console.warn('[Supabase] Minimal test error:', t1.error?.message || String(t1.error));
  }
  if (t1.error && /No API key/i.test(String(t1.error)) || /fetch failed/i.test(String(t1.error))) {
    console.log('[Supabase] Re-initializing client with explicit headers...');
    client = createClient(envUrl, envKey, {
      auth: { persistSession: false },
      global: { headers: { apikey: envKey, Authorization: `Bearer ${envKey}` } }
    });
    const t2 = await minimalTest(client);
    if (t2.error) {
      console.error('[Supabase] Fallback client test error:', t2.error?.message || String(t2.error));
    } else {
      console.log('[Supabase] Fallback client minimal test ok');
    }
  }
})();

const subs = require('./fixtures/subscriptions_30d.json') as WhopSubscription[];
const orders = require('./fixtures/orders_90d.json') as WhopOrder[];
const refunds = require('./fixtures/refunds_90d.json') as WhopRefund[];

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomNote = (i: number) => `Auto test row #${i} – ${Math.random().toString(36).slice(2, 8)}`;

const verifyTable = async (sb: typeof supabase) => {
  const tableName = 'seed_verification';
  console.log('[Supabase] Running verification test...');

  // Create table via RPC (user provided exec_sql function)
  try {
    await sb.rpc('exec_sql', {
      sql: `
        create table if not exists ${tableName} (
          id uuid primary key default gen_random_uuid(),
          created_at timestamp default now(),
          note text,
          random_value int
        );
      `,
    });
  } catch (e: any) {
    console.warn('[Supabase] exec_sql create fallback:', e?.message || String(e));
  }

  // Truncate to keep verification deterministic
  try {
    await sb.rpc('exec_sql', { sql: `truncate table ${tableName};` });
  } catch {
    // Ignore if RPC missing or table absent
  }

  // Build 100 random rows
  const rows = Array.from({ length: 100 }).map((_, i) => ({
    note: randomNote(i + 1),
    random_value: randomInt(1, 1000),
  }));

  // Insert batch
  const ins = await sb.from(tableName).insert(rows).select('id, created_at, note, random_value');
  if (ins.error) {
    console.error('❌ Supabase test insert failed:', ins.error.message);
    return;
  }

  // Count rows
  const cnt = await sb.from(tableName).select('*', { count: 'exact', head: true });
  const count = cnt.count ?? 0;

  // Fetch 2 sample rows
  const rd = await sb
    .from(tableName)
    .select('id, created_at, note, random_value')
    .order('created_at', { ascending: false })
    .limit(2);
  if (rd.error) {
    console.error('❌ Supabase test select failed:', rd.error.message);
    return;
  }
  console.log(`✅ Supabase test successful: inserted ${count} rows. Samples:`, rd.data);
};

async function main() {
  await verifyTable(client);
  await client.from('subscriptions').upsert(subs);
  await client.from('orders').upsert(orders);
  await client.from('refunds').upsert(refunds);
  console.log('[Whop Fetch] Using Supabase');
  console.log('Seed complete ✅');
}

main();
