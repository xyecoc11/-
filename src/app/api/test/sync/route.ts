import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { apiKeyGuard } from '@/lib/guard';

export const runtime = 'nodejs';

// Import sync functions directly
async function runSync(): Promise<any> {
  const { supabaseAdmin } = await import('@/lib/db');
  const WHOP_API_BASE = 'https://api.whop.com/api';
  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) throw new Error('WHOP_API_KEY not configured');

  const startTime = Date.now();
  let totalRecords = 0;

  try {
    // Fetch all data in parallel
    const [usersRes, subsRes, ordersRes, refundsRes] = await Promise.all([
      fetch(`${WHOP_API_BASE}/v2/users`, {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      }).then(r => r.json()),
      fetch(`${WHOP_API_BASE}/v2/subscriptions`, {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      }).then(r => r.json()),
      fetch(`${WHOP_API_BASE}/v2/orders`, {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      }).then(r => r.json()),
      fetch(`${WHOP_API_BASE}/v2/refunds`, {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      }).then(r => r.json()),
    ]);

    const whopUsers = Array.isArray(usersRes) ? usersRes : (usersRes.data || usersRes.users || []);
    const whopSubs = Array.isArray(subsRes) ? subsRes : (subsRes.data || subsRes.subscriptions || []);
    const whopOrders = Array.isArray(ordersRes) ? ordersRes : (ordersRes.data || ordersRes.orders || []);
    const whopRefunds = Array.isArray(refundsRes) ? refundsRes : (refundsRes.data || refundsRes.refunds || []);

    // Sync all data
    const usersToInsert = whopUsers.map((u: any) => ({
      id: u.id,
      email: u.email || null,
      username: u.username || null,
      created_at: u.created_at || new Date().toISOString(),
    }));
    const { error: usersErr } = await supabaseAdmin.from('users').upsert(usersToInsert, { onConflict: 'id' });
    if (usersErr) throw usersErr;

    const subsToInsert = whopSubs.map((s: any) => ({
      id: s.id,
      user_id: s.user_id,
      plan_id: s.plan_id || '',
      status: s.status || 'active',
      started_at: s.started_at || new Date().toISOString(),
      canceled_at: s.canceled_at || null,
      current_period_end: s.current_period_end || null,
      amount: s.amount || s.amount_cents || 0,
      interval: s.interval || 'month',
      currency: s.currency || 'usd',
      created_at: s.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    const { error: subsErr } = await supabaseAdmin.from('subscriptions').upsert(subsToInsert, { onConflict: 'id' });
    if (subsErr) throw subsErr;

    const ordersToInsert = whopOrders.map((o: any) => ({
      id: o.id,
      user_id: o.user_id,
      amount: o.amount || o.amount_cents || 0,
      currency: o.currency || 'usd',
      status: o.status || 'succeeded',
      created_at: o.created_at || new Date().toISOString(),
      updated_at: o.updated_at || new Date().toISOString(),
    }));
    const { error: ordersErr } = await supabaseAdmin.from('orders').upsert(ordersToInsert, { onConflict: 'id' });
    if (ordersErr) throw ordersErr;

    const orderIds = whopRefunds.map((r: any) => r.order_id).filter(Boolean);
    const { data: orders } = await supabaseAdmin.from('orders').select('id, user_id').in('id', orderIds);
    const orderToUserId = new Map<string, string>();
    if (orders) orders.forEach((o: any) => orderToUserId.set(o.id, o.user_id));

    const refundsToInsert = whopRefunds.map((r: any) => ({
      id: r.id,
      order_id: r.order_id,
      user_id: orderToUserId.get(r.order_id) || null,
      amount: r.amount || r.amount_cents || 0,
      reason: r.reason || null,
      created_at: r.created_at || new Date().toISOString(),
    }));
    const { error: refundsErr } = await supabaseAdmin.from('refunds').upsert(refundsToInsert, { onConflict: 'id' });
    if (refundsErr) throw refundsErr;

    totalRecords = usersToInsert.length + subsToInsert.length + ordersToInsert.length + refundsToInsert.length;
    await supabaseAdmin.from('sync_status').upsert({
      id: 'singleton',
      last_sync_at: new Date().toISOString(),
      last_sync_type: 'full',
      records_synced: totalRecords,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    return {
      status: 'ok',
      duration_ms: Date.now() - startTime,
      synced_users: usersToInsert.length,
      synced_subscriptions: subsToInsert.length,
      synced_orders: ordersToInsert.length,
      synced_refunds: refundsToInsert.length,
      total_records: totalRecords,
    };
  } catch (error: any) {
    throw error;
  }
}

export async function GET() {
  const guardError = apiKeyGuard();
  if (guardError) return guardError;

  try {
    console.info('[Test Sync] Starting end-to-end verification...');

    // Step 1: Trigger sync directly
    const syncResult = await runSync();
    console.info('[Test Sync] Sync completed:', syncResult);

    // Step 2: Read counts from Supabase
    const [
      usersCount,
      activeSubsCount,
      ordersSuccessCount,
      ordersFailedCount,
      refundsCount,
    ] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'succeeded'),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
      supabase.from('refunds').select('id', { count: 'exact', head: true }),
    ]);

    const totalUsers = usersCount.count || 0;
    const activeSubscriptions = activeSubsCount.count || 0;
    const ordersSucceeded = ordersSuccessCount.count || 0;
    const ordersFailed = ordersFailedCount.count || 0;
    const totalOrders = ordersSucceeded + ordersFailed;
    const totalRefunds = refundsCount.count || 0;

    console.info(`[Test Sync] Database counts: ${totalUsers} users, ${activeSubscriptions} active subs, ${totalOrders} orders (${ordersSucceeded} succeeded, ${ordersFailed} failed), ${totalRefunds} refunds`);

    // Step 3: Call /api/metrics and verify values
    const metricsResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/metrics`);
    
    if (!metricsResponse.ok) {
      throw new Error('Failed to fetch metrics');
    }

    const metrics = await metricsResponse.json();
    console.info('[Test Sync] Metrics fetched:', metrics);

    // Verify metrics are non-negative and reasonable
    const metricsValid = {
      mrr: metrics.mrr >= 0,
      arr: metrics.arr >= 0,
      churn: metrics.churn >= 0 && metrics.churn <= 1,
      failedPayments: metrics.failedPayments >= 0 && metrics.failedPayments <= 1,
      refundRate: metrics.refundRate >= 0 && metrics.refundRate <= 1,
      ltv: metrics.ltv >= 0,
      arpu: metrics.arpu >= 0,
      cac: metrics.cac >= 0,
      nrr: typeof metrics.nrr === 'number' && metrics.nrr >= 0 && metrics.nrr <= 2, // NRR can be > 1.0
    };

    const allMetricsValid = Object.values(metricsValid).every(v => v === true);

    // Build test report
    const report = {
      status: allMetricsValid && syncResult.status === 'ok' ? 'ok' : 'warning',
      sync: {
        status: syncResult.status,
        synced_users: syncResult.synced_users || 0,
        synced_subscriptions: syncResult.synced_subscriptions || 0,
        synced_orders: syncResult.synced_orders || 0,
        synced_refunds: syncResult.synced_refunds || 0,
      },
      database_counts: {
        total_users: totalUsers,
        active_subscriptions: activeSubscriptions,
        orders_synced: totalOrders,
        orders_succeeded: ordersSucceeded,
        orders_failed: ordersFailed,
        refunds_synced: totalRefunds,
      },
      metrics: {
        mrr: metrics.mrr,
        arr: metrics.arr,
        churn: metrics.churn,
        failedPayments: metrics.failedPayments,
        refundRate: metrics.refundRate,
        ltv: metrics.ltv,
        arpu: metrics.arpu,
        cac: metrics.cac,
        payback: metrics.payback,
        nrr: metrics.nrr,
      },
      metrics_valid: metricsValid,
      all_checks_passed: allMetricsValid && totalUsers > 0,
      test_summary: {
        sync_completed: syncResult.status === 'ok',
        database_populated: totalUsers > 0 && activeSubscriptions > 0,
        metrics_computed: allMetricsValid,
        pipeline_healthy: allMetricsValid && totalUsers > 0 && metrics.mrr >= 0,
      },
    };

    console.info('[Test Sync] Test report:', JSON.stringify(report, null, 2));

    // Print summary to console
    console.info(`
═══════════════════════════════════════
  Whop Sync - End-to-End Test Report
═══════════════════════════════════════
Status: ${report.status === 'ok' ? '✅ PASSED' : '⚠️  WARNING'}
───────────────────────────────────────
Sync Results:
  - Users: ${report.sync.synced_users}
  - Subscriptions: ${report.sync.synced_subscriptions}
  - Orders: ${report.sync.synced_orders}
  - Refunds: ${report.sync.synced_refunds}
───────────────────────────────────────
Database Counts:
  - Total Users: ${report.database_counts.total_users}
  - Active Subscriptions: ${report.database_counts.active_subscriptions}
  - Orders (Success): ${report.database_counts.orders_succeeded}
  - Orders (Failed): ${report.database_counts.orders_failed}
  - Refunds: ${report.database_counts.refunds_synced}
───────────────────────────────────────
Metrics:
  - MRR: $${(report.metrics.mrr / 100).toFixed(2)}
  - ARR: $${(report.metrics.arr / 100).toFixed(2)}
  - Churn: ${(report.metrics.churn * 100).toFixed(2)}%
  - Failed Payments: ${(report.metrics.failedPayments * 100).toFixed(2)}%
  - Refund Rate: ${(report.metrics.refundRate * 100).toFixed(2)}%
  - LTV: $${(report.metrics.ltv / 100).toFixed(2)}
  - ARPU: $${(report.metrics.arpu / 100).toFixed(2)}
  - CAC: $${(report.metrics.cac / 100).toFixed(2)}
  - Payback: ${report.metrics.payback ? report.metrics.payback.toFixed(2) + ' months' : 'N/A'}
  - NRR: ${(report.metrics.nrr * 100).toFixed(2)}%
───────────────────────────────────────
Health Checks:
  ✅ Sync Completed: ${report.test_summary.sync_completed}
  ✅ Database Populated: ${report.test_summary.database_populated}
  ✅ Metrics Computed: ${report.test_summary.metrics_computed}
  ✅ Pipeline Healthy: ${report.test_summary.pipeline_healthy}
═══════════════════════════════════════
    `);

    return NextResponse.json(report);
  } catch (error: any) {
    console.error('[Test Sync] Error:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error?.message || String(error),
        test_summary: {
          sync_completed: false,
          database_populated: false,
          metrics_computed: false,
          pipeline_healthy: false,
        },
      },
      { status: 500 }
    );
  }
}

