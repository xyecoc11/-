/*
  End-to-end webhook test runner
  Usage: npx ts-node tests/webhook_full_test.ts
*/

import { createClient } from '@supabase/supabase-js';

const API_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/whop';
const COMPANY_ID = process.env.TEST_COMPANY_ID || 'biz_test1';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[Test] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function sendWebhook(type: string, data: object) {
  const body = { id: `evt_${type}_${Date.now()}`, type, data } as any;
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch {}
  console.log(`[Webhook] ${type} ->`, res.status, json);
  await sleep(1000);
}

async function checkTable(table: string, filter: Record<string, any>) {
  const { data, error } = await supabase.from(table).select('*').match(filter);
  if (error) {
    console.error(`[Check] ${table} error:`, error.message);
    return false;
  }
  const ok = !!(data && data.length);
  console.log(`[Check] ${table} ${JSON.stringify(filter)} ->`, ok ? '✅ Found' : '❌ Not found');
  return ok;
}

async function run() {
  console.log('--- Webhook E2E Test Start ---');

  await sendWebhook('company.installed', { company: { id: COMPANY_ID, name: 'AutoTest Co' } });
  await checkTable('companies', { id: COMPANY_ID, install_status: 'installed' });

  await sendWebhook('order.created', { company: { id: COMPANY_ID }, order: { id: 'ord_auto', amount: 12.5, currency: 'USD', status: 'paid', channel: 'email' } });
  await checkTable('orders', { id: 'ord_auto', company_id: COMPANY_ID });

  await sendWebhook('payment.failed', { company: { id: COMPANY_ID }, order: { id: 'ord_auto', amount: 12.5, currency: 'USD' } });
  await checkTable('orders', { id: 'ord_auto', status: 'failed' });

  await sendWebhook('subscription.created', { company: { id: COMPANY_ID }, subscription: { id: 'sub_auto', user_id: 'usr_1', amount: 9.9, currency: 'USD', interval: 'month', started_at: new Date().toISOString(), status: 'active' } });
  await checkTable('subscriptions', { id: 'sub_auto', company_id: COMPANY_ID });

  await sendWebhook('subscription.canceled', { company: { id: COMPANY_ID }, subscription: { id: 'sub_auto', canceled_at: new Date().toISOString() } });
  await checkTable('subscriptions', { id: 'sub_auto', status: 'canceled' });

  await sendWebhook('refund.created', { company: { id: COMPANY_ID }, refund: { id: 'ref_auto', order_id: 'ord_auto', amount: 9.9, reason: 'user_request', status: 'processed', created_at: new Date().toISOString() } });
  await checkTable('refunds', { id: 'ref_auto', company_id: COMPANY_ID });

  await sendWebhook('analytics.updated', { company: { id: COMPANY_ID }, period_key: 'test_period', payload_json: { metric: 'demo', value: 42 } });
  await checkTable('analytics_cache', { company_id: COMPANY_ID, period_key: 'test_period' });

  console.log('--- Webhook E2E Test Done ---');
}

run().catch((e) => { console.error(e); process.exit(1); });


