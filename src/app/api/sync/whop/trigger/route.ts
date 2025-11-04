import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';
import { apiKeyGuard } from '@/lib/guard';

export const runtime = 'nodejs';

const WHOP_API_BASE = 'https://api.whop.com';

interface WhopUser {
  id: string;
  email?: string;
  username?: string;
  created_at?: string;
}

interface WhopSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  started_at: string;
  canceled_at?: string;
  current_period_end?: string;
  amount?: number;
  amount_cents?: number;
  interval?: string;
  currency?: string;
  created_at?: string;
}

interface WhopOrder {
  id: string;
  user_id: string;
  amount?: number;
  amount_cents?: number;
  currency?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

interface WhopRefund {
  id: string;
  order_id: string;
  amount?: number;
  amount_cents?: number;
  reason?: string;
  created_at?: string;
}

// Fetch users from Whop API
async function fetchWhopUsers(): Promise<WhopUser[]> {
  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) throw new Error('WHOP_API_KEY not configured');

  const response = await fetch(`${WHOP_API_BASE}/api/v2/members`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`Whop API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data.data || data.users || []);
}

// Fetch subscriptions from Whop API
async function fetchWhopSubscriptions(): Promise<WhopSubscription[]> {
  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) throw new Error('WHOP_API_KEY not configured');

  const response = await fetch(`${WHOP_API_BASE}/api/v2/memberships`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`Whop API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data.data || data.subscriptions || []);
}

// Fetch orders from Whop API
async function fetchWhopOrders(): Promise<WhopOrder[]> {
  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) throw new Error('WHOP_API_KEY not configured');

  const response = await fetch(`${WHOP_API_BASE}/api/v2/payments`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`Whop API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data.data || data.orders || []);
}

// Fetch refunds from Whop API
async function fetchWhopRefunds(): Promise<WhopRefund[]> {
  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) throw new Error('WHOP_API_KEY not configured');

  const response = await fetch(`${WHOP_API_BASE}/api/v2/payments?type=refund`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`Whop API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data.data || data.refunds || []);
}

// Sync users
async function syncUsers(whopUsers: WhopUser[]): Promise<number> {
  if (whopUsers.length === 0) return 0;

  const usersToInsert = whopUsers.map(user => ({
    id: user.id,
    email: user.email || null,
    username: user.username || null,
    created_at: user.created_at || new Date().toISOString(),
  }));

  const { error } = await supabaseAdmin
    .from('users')
    .upsert(usersToInsert, { onConflict: 'id' });

  if (error) {
    console.error('[Sync] Error syncing users:', error);
    throw error;
  }

  return usersToInsert.length;
}

// Sync subscriptions
async function syncSubscriptions(whopSubs: WhopSubscription[]): Promise<number> {
  if (whopSubs.length === 0) return 0;

  const subsToInsert = whopSubs.map(sub => ({
    id: sub.id,
    user_id: sub.user_id,
    plan_id: sub.plan_id || '',
    status: sub.status || 'active',
    started_at: sub.started_at || new Date().toISOString(),
    canceled_at: sub.canceled_at || null,
    current_period_end: sub.current_period_end || null,
    amount: sub.amount || sub.amount_cents || 0,
    interval: sub.interval || 'month',
    currency: sub.currency || 'usd',
    created_at: sub.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .upsert(subsToInsert, { onConflict: 'id' });

  if (error) {
    console.error('[Sync] Error syncing subscriptions:', error);
    throw error;
  }

  return subsToInsert.length;
}

// Sync orders
async function syncOrders(whopOrders: WhopOrder[]): Promise<number> {
  if (whopOrders.length === 0) return 0;

  const ordersToInsert = whopOrders.map(order => ({
    id: order.id,
    user_id: order.user_id,
    amount: order.amount || order.amount_cents || 0,
    currency: order.currency || 'usd',
    status: order.status || 'succeeded',
    created_at: order.created_at || new Date().toISOString(),
    updated_at: order.updated_at || new Date().toISOString(),
  }));

  const { error } = await supabaseAdmin
    .from('orders')
    .upsert(ordersToInsert, { onConflict: 'id' });

  if (error) {
    console.error('[Sync] Error syncing orders:', error);
    throw error;
  }

  return ordersToInsert.length;
}

// Sync refunds
async function syncRefunds(whopRefunds: WhopRefund[]): Promise<number> {
  if (whopRefunds.length === 0) return 0;

  const orderIds = whopRefunds.map(r => r.order_id).filter(Boolean);
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, user_id')
    .in('id', orderIds);

  const orderToUserId = new Map<string, string>();
  if (orders) {
    orders.forEach(o => orderToUserId.set(o.id, o.user_id));
  }

  const refundsToInsert = whopRefunds.map(refund => ({
    id: refund.id,
    order_id: refund.order_id,
    user_id: orderToUserId.get(refund.order_id) || null,
    amount: refund.amount || refund.amount_cents || 0,
    reason: refund.reason || null,
    created_at: refund.created_at || new Date().toISOString(),
  }));

  const { error } = await supabaseAdmin
    .from('refunds')
    .upsert(refundsToInsert, { onConflict: 'id' });

  if (error) {
    console.error('[Sync] Error syncing refunds:', error);
    throw error;
  }

  return refundsToInsert.length;
}

// Update sync status
async function updateSyncStatus(
  lastSyncType: string,
  recordsSynced: number,
  errorMessage?: string
) {
  await supabaseAdmin.from('sync_status').upsert({
    id: 'singleton',
    last_sync_at: new Date().toISOString(),
    last_sync_type: lastSyncType,
    records_synced: recordsSynced,
    error_message: errorMessage || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
}

// Frontend-triggerable endpoint (no SYNC_TOKEN required, but still requires WHOP_API_KEY)
export async function GET() {
  const guardError = apiKeyGuard();
  if (guardError) return guardError;

  const startTime = Date.now();
  let totalRecords = 0;
  let errorMessage: string | undefined;

  try {
    console.info('[Whop Sync] Starting sync (triggered from frontend)...');

    const [whopUsers, whopSubs, whopOrders, whopRefunds] = await Promise.all([
      fetchWhopUsers(),
      fetchWhopSubscriptions(),
      fetchWhopOrders(),
      fetchWhopRefunds(),
    ]);

    console.info(`[Whop Sync] Fetched: ${whopUsers.length} users, ${whopSubs.length} subs, ${whopOrders.length} orders, ${whopRefunds.length} refunds`);

    const [usersSynced, subsSynced, ordersSynced, refundsSynced] = await Promise.all([
      syncUsers(whopUsers),
      syncSubscriptions(whopSubs),
      syncOrders(whopOrders),
      syncRefunds(whopRefunds),
    ]);

    totalRecords = usersSynced + subsSynced + ordersSynced + refundsSynced;

    await updateSyncStatus('full', totalRecords);

    const duration = Date.now() - startTime;
    const report = {
      status: 'ok',
      duration_ms: duration,
      synced_users: usersSynced,
      synced_subscriptions: subsSynced,
      synced_orders: ordersSynced,
      synced_refunds: refundsSynced,
      total_records: totalRecords,
    };

    console.info('[Whop Sync] Success', report);
    return NextResponse.json(report);
  } catch (error: any) {
    errorMessage = error?.message || String(error);
    console.error('[Whop Sync] Error:', errorMessage);
    
    await updateSyncStatus('full', totalRecords, errorMessage);

    return NextResponse.json(
      {
        status: 'error',
        error: errorMessage,
        synced_records: totalRecords,
      },
      { status: 500 }
    );
  }
}

