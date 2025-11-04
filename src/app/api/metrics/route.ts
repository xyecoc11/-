import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import dayjs from 'dayjs';
import { parseCompanyId } from '@/lib/validate';

export const runtime = 'nodejs';

interface MetricsResponse {
  mrr: number;
  arr: number;
  churn: number;
  failedPayments: number;
  refundRate: number;
  ltv: number;
  arpu: number;
  cac: number;
  payback: number | null;
  nrr: number;
}

// Compute MRR from active monthly subscriptions
async function computeMRR(): Promise<number> {
  const now = new Date();
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('amount, interval')
    .in('status', ['active', 'trialing'])
    .lte('started_at', now.toISOString())
    .or('canceled_at.is.null,canceled_at.gt.' + now.toISOString());

  if (!subs) return 0;

  let mrr = 0;
  for (const sub of subs) {
    const amount = Number(sub.amount) || 0;
    if (sub.interval === 'month') {
      mrr += amount;
    } else if (sub.interval === 'year') {
      mrr += amount / 12;
    }
  }
  return Math.round(mrr);
}

// Compute Churn Rate: canceled subs last 30d / active subs 30d ago
async function computeChurnRate(): Promise<number> {
  const now = dayjs();
  const thirtyDaysAgo = now.subtract(30, 'day');
  const sixtyDaysAgo = now.subtract(60, 'day');

  // Active subscriptions 30 days ago
  const { data: active30dAgo } = await supabase
    .from('subscriptions')
    .select('id')
    .lte('started_at', thirtyDaysAgo.toISOString())
    .or(`canceled_at.is.null,canceled_at.gt.${thirtyDaysAgo.toISOString()}`)
    .in('status', ['active', 'trialing']);

  // Canceled subscriptions in the last 30 days
  const { data: canceledLast30d } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('status', 'canceled')
    .gte('canceled_at', thirtyDaysAgo.toISOString())
    .lte('canceled_at', now.toISOString());

  const activeCount = active30dAgo?.length || 0;
  const canceledCount = canceledLast30d?.length || 0;

  if (activeCount === 0) return 0;
  return canceledCount / activeCount;
}

// Failed Payments %: failed orders / total orders (30d)
async function computeFailedPaymentsRate(): Promise<number> {
  const thirtyDaysAgo = dayjs().subtract(30, 'day').toISOString();

  const { data: orders } = await supabase
    .from('orders')
    .select('id, status')
    .gte('created_at', thirtyDaysAgo);

  if (!orders || orders.length === 0) return 0;

  const failed = orders.filter(o => o.status === 'failed').length;
  return failed / orders.length;
}

// Refund Rate: refund amount / total payment amount (30d)
async function computeRefundRate(): Promise<number> {
  const thirtyDaysAgo = dayjs().subtract(30, 'day').toISOString();

  const [ordersRes, refundsRes] = await Promise.all([
    supabase.from('orders').select('amount').gte('created_at', thirtyDaysAgo),
    supabase.from('refunds').select('amount').gte('created_at', thirtyDaysAgo),
  ]);

  const orders = ordersRes.data || [];
  const refunds = refundsRes.data || [];

  const totalAmount = orders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  if (totalAmount === 0) return 0;

  const refundAmount = refunds.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  return refundAmount / totalAmount;
}

// LTV: avg(total lifetime revenue per user)
async function computeLTV(): Promise<number> {
  const { data: orders } = await supabase
    .from('orders')
    .select('user_id, amount, status')
    .eq('status', 'succeeded');

  if (!orders || orders.length === 0) return 0;

  // Group by user_id and sum revenue
  const userRevenue = new Map<string, number>();
  for (const order of orders) {
    const userId = order.user_id;
    const amount = Number(order.amount) || 0;
    userRevenue.set(userId, (userRevenue.get(userId) || 0) + amount);
  }

  const revenues = Array.from(userRevenue.values());
  const avg = revenues.reduce((sum, val) => sum + val, 0) / revenues.length;
  return Math.round(avg);
}

// ARPU: total revenue / active users
async function computeARPU(): Promise<number> {
  const { data: activeSubs } = await supabase
    .from('subscriptions')
    .select('user_id')
    .in('status', ['active', 'trialing']);

  if (!activeSubs || activeSubs.length === 0) return 0;

  const activeUsers = new Set(activeSubs.map(s => s.user_id)).size;
  if (activeUsers === 0) return 0;

  const { data: orders } = await supabase
    .from('orders')
    .select('amount')
    .eq('status', 'succeeded');

  const totalRevenue = (orders || []).reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  return Math.round(totalRevenue / activeUsers);
}

// NRR: (MRR_current - Contraction + Expansion) / MRR_previous × 100
async function computeNRR(): Promise<number> {
  const now = dayjs();
  const thisMonthStart = now.startOf('month');
  const lastMonthStart = now.subtract(1, 'month').startOf('month');
  const lastMonthEnd = now.subtract(1, 'month').endOf('month');

  // Current MRR (active subscriptions)
  const currentMRR = await computeMRR();

  // Previous month MRR
  const { data: prevSubs } = await supabase
    .from('subscriptions')
    .select('amount, interval, started_at, canceled_at')
    .in('status', ['active', 'trialing'])
    .lte('started_at', lastMonthEnd.toISOString())
    .or(`canceled_at.is.null,canceled_at.gt.${lastMonthEnd.toISOString()}`);

  let prevMRR = 0;
  if (prevSubs) {
    for (const sub of prevSubs) {
      const amount = Number(sub.amount) || 0;
      if (sub.interval === 'month') {
        prevMRR += amount;
      } else if (sub.interval === 'year') {
        prevMRR += amount / 12;
      }
    }
  }

  // Expansion: subscriptions upgraded in current month
  const { data: upgrades } = await supabase
    .from('subscriptions')
    .select('amount, interval')
    .gte('started_at', thisMonthStart.toISOString())
    .in('status', ['active', 'trialing']);

  let expansion = 0;
  if (upgrades) {
    for (const sub of upgrades) {
      const amount = Number(sub.amount) || 0;
      if (sub.interval === 'month') {
        expansion += amount;
      } else if (sub.interval === 'year') {
        expansion += amount / 12;
      }
    }
  }

  // Contraction: subscriptions downgraded or canceled in current month
  const { data: cancellations } = await supabase
    .from('subscriptions')
    .select('amount, interval')
    .eq('status', 'canceled')
    .gte('canceled_at', thisMonthStart.toISOString())
    .lte('canceled_at', now.toISOString());

  let contraction = 0;
  if (cancellations) {
    for (const sub of cancellations) {
      const amount = Number(sub.amount) || 0;
      if (sub.interval === 'month') {
        contraction += amount;
      } else if (sub.interval === 'year') {
        contraction += amount / 12;
      }
    }
  }

  if (prevMRR === 0) return 0;
  const nrr = (currentMRR - contraction + expansion) / prevMRR;
  return Math.round(nrr * 10000) / 10000; // Return as decimal (0-1+), rounded to 4 decimals
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const companyId = url.searchParams.get('companyId') ? parseCompanyId(url.searchParams.get('companyId')) : undefined;
    const [
      mrr,
      churn,
      failedPayments,
      refundRate,
      ltv,
      arpu,
      nrr,
    ] = await Promise.all([
      (async () => {
        if (!companyId) return computeMRR();
        const { data: subs } = await supabase
          .from('subscriptions')
          .select('amount, interval, started_at, canceled_at, status, company_id')
          .eq('company_id', companyId)
          .in('status', ['active', 'trialing']);
        if (!subs) return 0;
        let mrr = 0;
        for (const sub of subs as any[]) {
          const amount = Number((sub as any).amount) || 0;
          const interval = (sub as any).interval;
          mrr += interval === 'year' ? amount / 12 : amount;
        }
        return Math.round(mrr);
      })(),
      (async () => {
        if (!companyId) return computeChurnRate();
        const now = dayjs();
        const thirtyDaysAgo = now.subtract(30, 'day');
        const { data: active30dAgo } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('company_id', companyId)
          .lte('started_at', thirtyDaysAgo.toISOString())
          .or(`canceled_at.is.null,canceled_at.gt.${thirtyDaysAgo.toISOString()}`)
          .in('status', ['active', 'trialing']);
        const { data: canceledLast30d } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('company_id', companyId)
          .eq('status', 'canceled')
          .gte('canceled_at', thirtyDaysAgo.toISOString())
          .lte('canceled_at', now.toISOString());
        const activeCount = active30dAgo?.length || 0;
        const canceledCount = canceledLast30d?.length || 0;
        return activeCount === 0 ? 0 : canceledCount / activeCount;
      })(),
      (async () => {
        if (!companyId) return computeFailedPaymentsRate();
        const thirtyDaysAgo = dayjs().subtract(30, 'day').toISOString();
        const { data: orders } = await supabase
          .from('orders')
          .select('id, status, company_id')
          .eq('company_id', companyId)
          .gte('created_at', thirtyDaysAgo);
        if (!orders || orders.length === 0) return 0;
        const failed = orders.filter((o: any) => o.status === 'failed').length;
        return failed / orders.length;
      })(),
      (async () => {
        if (!companyId) return computeRefundRate();
        const thirtyDaysAgo = dayjs().subtract(30, 'day').toISOString();
        const [ordersRes, refundsRes] = await Promise.all([
          supabase.from('orders').select('amount, company_id').eq('company_id', companyId).gte('created_at', thirtyDaysAgo),
          supabase.from('refunds').select('amount, company_id').eq('company_id', companyId).gte('created_at', thirtyDaysAgo),
        ]);
        const orders = ordersRes.data || [];
        const refunds = refundsRes.data || [];
        const totalAmount = orders.reduce((sum: number, o: any) => sum + (Number(o.amount) || 0), 0);
        if (totalAmount === 0) return 0;
        const refundAmount = refunds.reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0);
        return refundAmount / totalAmount;
      })(),
      (async () => {
        if (!companyId) return computeLTV();
        const { data: orders } = await supabase
          .from('orders')
          .select('user_id, amount, status, company_id')
          .eq('company_id', companyId)
          .eq('status', 'succeeded');
        if (!orders || orders.length === 0) return 0;
        const userRevenue = new Map<string, number>();
        for (const order of orders as any[]) {
          const userId = (order as any).user_id;
          const amount = Number((order as any).amount) || 0;
          userRevenue.set(userId, (userRevenue.get(userId) || 0) + amount);
        }
        const revenues = Array.from(userRevenue.values());
        const avg = revenues.reduce((sum, val) => sum + val, 0) / revenues.length;
        return Math.round(avg);
      })(),
      (async () => {
        if (!companyId) return computeARPU();
        const { data: activeSubs } = await supabase
          .from('subscriptions')
          .select('user_id, company_id')
          .eq('company_id', companyId)
          .in('status', ['active', 'trialing']);
        if (!activeSubs || activeSubs.length === 0) return 0;
        const activeUsers = new Set((activeSubs as any[]).map((s: any) => s.user_id)).size;
        if (activeUsers === 0) return 0;
        const { data: orders } = await supabase
          .from('orders')
          .select('amount, company_id')
          .eq('company_id', companyId)
          .eq('status', 'succeeded');
        const totalRevenue = (orders || []).reduce((sum: number, o: any) => sum + (Number(o.amount) || 0), 0);
        return Math.round(totalRevenue / activeUsers);
      })(),
      (async () => {
        if (!companyId) return computeNRR();
        const now = dayjs();
        const thisMonthStart = now.startOf('month');
        const lastMonthEnd = now.subtract(1, 'month').endOf('month');
        // current MRR for company
        const { data: currentSubs } = await supabase
          .from('subscriptions')
          .select('amount, interval, company_id, status')
          .eq('company_id', companyId)
          .in('status', ['active', 'trialing']);
        let currentMRR = 0;
        for (const s of (currentSubs || []) as any[]) {
          const amount = Number((s as any).amount) || 0;
          currentMRR += (s as any).interval === 'year' ? amount / 12 : amount;
        }
        const { data: prevSubs } = await supabase
          .from('subscriptions')
          .select('amount, interval, started_at, canceled_at, company_id, status')
          .eq('company_id', companyId)
          .in('status', ['active', 'trialing'])
          .lte('started_at', lastMonthEnd.toISOString())
          .or(`canceled_at.is.null,canceled_at.gt.${lastMonthEnd.toISOString()}`);
        let prevMRR = 0;
        for (const s of (prevSubs || []) as any[]) {
          const amount = Number((s as any).amount) || 0;
          prevMRR += (s as any).interval === 'year' ? amount / 12 : amount;
        }
        if (prevMRR === 0) return 0;
        // For simplicity, ignore explicit expansion/contraction here and use ratio of current to previous MRR
        const nrr = currentMRR / prevMRR;
        return Math.round(nrr * 10000) / 10000;
      })(),
    ]);

    const arr = mrr * 12;
    const cac = parseFloat(process.env.CAC || '0'); // Placeholder until integrated
    const payback = cac > 0 ? ltv / cac : null;

    const metrics: MetricsResponse = {
      mrr,
      arr,
      churn,
      failedPayments,
      refundRate,
      ltv,
      arpu,
      cac,
      payback,
      nrr,
    };

    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error('[Metrics API] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to compute metrics' },
      { status: 500 }
    );
  }
}

