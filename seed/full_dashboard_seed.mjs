import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
dotenv.config({ path: '../.env.local' });
dotenv.config({ path: '../.env' });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || (!SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_ANON_KEY)) {
  console.error('Missing SUPABASE_URL or keys (need SERVICE_ROLE_KEY or ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const COMPANY_ID = process.env.SEED_COMPANY_ID || 'biz_test1';

const now = new Date();
const iso = (d) => new Date(d).toISOString();
const daysAgo = (n) => iso(new Date(Date.now() - n * 24 * 60 * 60 * 1000));

async function ensureFeatureEventsTable() {
  // Best-effort: upsert and if table missing, instruct to run migration
  try {
    await supabase.from('feature_events').select('id').limit(1);
    return true;
  } catch (e) {
    console.warn('[seed] feature_events not found; create it via migration 20251105_feature_events.sql');
    return false;
  }
}

async function seed() {
  console.log('🌱 Starting full dashboard seed...');

  // Companies
  await supabase.from('companies').upsert({
    id: COMPANY_ID,
    name: 'Demo Company',
    install_status: 'installed',
    last_synced_at: iso(now),
    updated_at: iso(now),
  }, { onConflict: 'id' });

  // Orders (paid/succeeded + failed + channels)
  const ordersInitial = [
    { id: 'ord_101', company_id: COMPANY_ID, user_id: 'usr_1', plan_id: 'basic', amount: 49.9, currency: 'USD', status: 'succeeded', channel: 'email', created_at: daysAgo(25) },
    { id: 'ord_102', company_id: COMPANY_ID, user_id: 'usr_2', plan_id: 'pro', amount: 59.9, currency: 'USD', status: 'succeeded', channel: 'telegram', created_at: daysAgo(20) },
    { id: 'ord_103', company_id: COMPANY_ID, user_id: 'usr_3', plan_id: 'pro', amount: 69.9, currency: 'USD', status: 'succeeded', channel: 'discord', created_at: daysAgo(15) },
    { id: 'ord_104', company_id: COMPANY_ID, user_id: 'usr_4', plan_id: 'basic', amount: 79.9, currency: 'USD', status: 'failed', channel: 'email', created_at: daysAgo(10) },
    { id: 'ord_105', company_id: COMPANY_ID, user_id: 'usr_5', plan_id: 'enterprise', amount: 99.9, currency: 'USD', status: 'failed', channel: 'telegram', created_at: daysAgo(9) },
    { id: 'ord_106', company_id: COMPANY_ID, user_id: 'usr_6', plan_id: 'enterprise', amount: 89.9, currency: 'USD', status: 'failed', channel: 'discord', created_at: daysAgo(8) },
  ];
  let { error: ordersErr } = await supabase.from('orders').upsert(ordersInitial, { onConflict: 'id' });
  if (ordersErr) throw ordersErr;
  console.log('Inserted orders (initial):', ordersInitial.length);

  // recover two failed in separate batch
  const ordersRecover = [
    { id: 'ord_105', company_id: COMPANY_ID, user_id: 'usr_5', amount: 99.9, currency: 'USD', status: 'succeeded', channel: 'telegram', created_at: daysAgo(9), updated_at: daysAgo(3) },
    { id: 'ord_106', company_id: COMPANY_ID, user_id: 'usr_6', amount: 89.9, currency: 'USD', status: 'succeeded', channel: 'discord', created_at: daysAgo(8), updated_at: daysAgo(2) },
  ];
  let { error: recoverErr } = await supabase.from('orders').upsert(ordersRecover, { onConflict: 'id' });
  if (recoverErr) throw recoverErr;
  console.log('Updated orders (recovered):', ordersRecover.length);
  
  // explicit retry order: first failed, then succeeded
  const retryFailed = { id: 'ord_retry_1', company_id: COMPANY_ID, user_id: 'usr_7', plan_id: 'basic', amount: 39.9, currency: 'USD', status: 'failed', channel: 'email', created_at: daysAgo(3), updated_at: daysAgo(3) };
  let { error: retryFailedErr } = await supabase.from('orders').upsert(retryFailed, { onConflict: 'id' });
  if (retryFailedErr) throw retryFailedErr;
  const retrySucceeded = { id: 'ord_retry_1', company_id: COMPANY_ID, user_id: 'usr_7', plan_id: 'basic', amount: 39.9, currency: 'USD', status: 'succeeded', channel: 'email', created_at: daysAgo(3), updated_at: daysAgo(1) };
  let { error: retrySucceededErr } = await supabase.from('orders').upsert(retrySucceeded, { onConflict: 'id' });
  if (retrySucceededErr) throw retrySucceededErr;
  console.log('Inserted retry order (failed -> succeeded): ord_retry_1');

  // Subscriptions: 3 active, 1 canceled, 1 upgraded (same user usr_2)
  const subs = [
    { id: 'sub_1', user_id: 'usr_1', company_id: COMPANY_ID, plan_id: 'basic', amount: 29.9, interval: 'month', currency: 'USD', status: 'active', started_at: daysAgo(60), current_period_end: daysAgo(30), created_at: daysAgo(60), updated_at: iso(now) },
    { id: 'sub_2', user_id: 'usr_2', company_id: COMPANY_ID, plan_id: 'pro', amount: 49.9, interval: 'month', currency: 'USD', status: 'active', started_at: daysAgo(45), current_period_end: daysAgo(15), created_at: daysAgo(45), updated_at: iso(now) },
    { id: 'sub_3', user_id: 'usr_3', company_id: COMPANY_ID, plan_id: 'pro', amount: 49.9, interval: 'month', currency: 'USD', status: 'canceled', started_at: daysAgo(40), canceled_at: daysAgo(2), created_at: daysAgo(40), updated_at: iso(now) },
    { id: 'sub_4', user_id: 'usr_2', company_id: COMPANY_ID, plan_id: 'enterprise', amount: 79.9, interval: 'month', currency: 'USD', status: 'active', started_at: daysAgo(2), created_at: daysAgo(2), updated_at: iso(now) },
    // current-month new sub
    { id: 'sub_5', user_id: 'usr_8', company_id: COMPANY_ID, plan_id: 'basic', amount: 19.9, interval: 'month', currency: 'USD', status: 'active', started_at: daysAgo(1), created_at: daysAgo(1), updated_at: iso(now) },
  ];
  let { error: subsErr } = await supabase.from('subscriptions').upsert(subs, { onConflict: 'id' });
  if (subsErr) throw subsErr;
  console.log('Inserted/updated subscriptions:', subs.length);

  // Refunds
  const refunds = [
    { id: 'ref_1', company_id: COMPANY_ID, user_id: 'usr_1', order_id: 'ord_101', amount: 19.9, reason: 'user_request', status: 'recovered', created_at: daysAgo(19) },
    { id: 'ref_2', company_id: COMPANY_ID, user_id: 'usr_3', order_id: 'ord_103', amount: 9.9, reason: 'card_dispute', status: 'processed', created_at: daysAgo(14) },
  ];
  let { error: refundsErr } = await supabase.from('refunds').upsert(refunds, { onConflict: 'id' });
  if (refundsErr) throw refundsErr;
  console.log('Inserted refunds:', refunds.length);

  // Marketing costs (for CAC)
  const marketing = [
    { id: 'mkt_1', company_id: COMPANY_ID, period: new Date(), cost: 150, source: 'facebook' },
    { id: 'mkt_2', company_id: COMPANY_ID, period: new Date(), cost: 100, source: 'google' },
  ];
  let { error: mktErr } = await supabase.from('marketing_costs').upsert(marketing, { onConflict: 'id' });
  if (mktErr) throw mktErr;
  console.log('Inserted marketing_costs:', marketing.length);

  // Feature adoption events (if table exists)
  const hasFeature = await ensureFeatureEventsTable();
  if (hasFeature) {
    const features = [
      { id: 'feat_1', company_id: COMPANY_ID, user_id: 'usr_1', feature: 'dashboard_view', timestamp: daysAgo(7) },
      { id: 'feat_2', company_id: COMPANY_ID, user_id: 'usr_2', feature: 'report_download', timestamp: daysAgo(5) },
      { id: 'feat_3', company_id: COMPANY_ID, user_id: 'usr_3', feature: 'payment_retry', timestamp: daysAgo(3) },
      { id: 'feat_4', company_id: COMPANY_ID, user_id: 'usr_4', feature: 'insight_click', timestamp: daysAgo(2) },
      { id: 'feat_5', company_id: COMPANY_ID, user_id: 'usr_5', feature: 'cohort_view', timestamp: daysAgo(1) },
    ];
    let { error: featErr } = await supabase.from('feature_events').upsert(features, { onConflict: 'id' });
    if (featErr) console.warn('[seed] feature_events upsert error:', featErr.message);
    else console.log('Inserted feature_events:', features.length);
  }

  // Clear analytics_cache for company and insert features cache
  await supabase.from('analytics_cache').delete().eq('company_id', COMPANY_ID);
  await supabase.from('analytics_cache').upsert({
    company_id: COMPANY_ID,
    period_key: 'features',
    payload_json: {
      ahaMomentRate: 0.62,
      timeToValueMin: 11,
      features: [
        { feature: 'dashboard_view', adoptionRate: 0.85, retentionUplift: 0.12 },
        { feature: 'report_download', adoptionRate: 0.72, retentionUplift: 0.08 },
        { feature: 'payment_retry', adoptionRate: 0.41, retentionUplift: 0.05 },
      ],
    },
    refreshed_at: iso(now),
  }, { onConflict: 'company_id,period_key' });
  console.log('Updated analytics_cache.features');

  // Seed webhook_events for recoveryByDay (payment.failed processed → recovered)
  const whEvents = [
    { id: 'evt_seed_fail_1', type: 'payment.failed', company_id: COMPANY_ID, received_at: daysAgo(7), processed_at: daysAgo(6), status: 'processed' },
    { id: 'evt_seed_fail_2', type: 'payment.failed', company_id: COMPANY_ID, received_at: daysAgo(5), processed_at: daysAgo(3), status: 'recovered' },
    { id: 'evt_seed_fail_3', type: 'payment.failed', company_id: COMPANY_ID, received_at: daysAgo(2), processed_at: daysAgo(1), status: 'recovered' },
  ];
  await supabase.from('webhook_events').upsert(whEvents, { onConflict: 'id' });
  console.log('Inserted webhook_events for recovery metrics');

  console.log('✅ Mock data seeded successfully.');
}

seed().catch((e) => { console.error(e); process.exit(1); });
