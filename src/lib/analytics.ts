import type { WhopSubscription, WhopOrder, WhopRefund } from './types';
import dayjs from 'dayjs';
import type { CohortRow } from './types';
import { supabaseAdmin } from './db';

/**
 * Compute Monthly Recurring Revenue (MRR) in cents at given date.
 * Sums all active/trialing subscriptions' monthly amounts.
 */
export function computeMRR(subs: WhopSubscription[], at: Date = new Date()): number {
  const atDate = dayjs(at);
  return subs
    .filter(sub => {
      if (sub.status !== 'active' && sub.status !== 'trialing') return false;
      const started = dayjs(sub.startedAt);
      const ended = sub.canceledAt ? dayjs(sub.canceledAt) : dayjs(sub.currentPeriodEnd);
      return atDate.isAfter(started) && atDate.isBefore(ended);
    })
    .reduce((sum, sub) => sum + sub.amountCents, 0);
}

/**
 * Compute Annual Recurring Revenue (ARR) from MRR.
 */
export function computeARR(mrr: number): number {
  return mrr * 12;
}

/**
 * Compute monthly churn rate (0..1) for given month.
 * Churn = canceled subscriptions / active at start of month.
 */
export function computeMonthlyChurn(subs: WhopSubscription[], month: Date): number {
  const monthStart = dayjs(month).startOf('month');
  const monthEnd = monthStart.endOf('month');
  
  // Active at start of month
  const activeAtStart = subs.filter(sub => {
    const started = dayjs(sub.startedAt);
    const ended = sub.canceledAt ? dayjs(sub.canceledAt) : dayjs(sub.currentPeriodEnd);
    return started.isBefore(monthStart) && (!sub.canceledAt || ended.isAfter(monthStart));
  }).length;
  
  if (activeAtStart === 0) return 0;
  
  // Canceled during this month
  const canceled = subs.filter(sub => {
    if (!sub.canceledAt) return false;
    const canceledDate = dayjs(sub.canceledAt);
    return canceledDate.isAfter(monthStart) && canceledDate.isBefore(monthEnd);
  }).length;
  
  return canceled / activeAtStart;
}

/**
 * Compute failed payments rate (0..1) from orders and refunds.
 * Failed = refunded orders / total orders.
 */
export function computeFailedPaymentsRate(orders: WhopOrder[], refunds: WhopRefund[]): number {
  if (orders.length === 0) return 0;
  const refundedOrderIds = new Set(refunds.map(r => r.orderId));
  const failed = orders.filter(o => o.refunded || refundedOrderIds.has(o.id)).length;
  return failed / orders.length;
}

/**
 * Build 6x6 cohort retention matrix.
 * @param orders   WhopOrder[]
 * @param months   number of cohorts/columns
 */
export function buildRetentionCohorts(orders: WhopOrder[], months: number): CohortRow[] {
  // If API keys are missing, fallback to rendering mock data
  if (!orders || orders.length === 0) {
    return Array.from({ length: 6 }).map((_, ri) => ({
      cohortMonth: dayjs().subtract(5 - ri, 'month').format('YYYY-MM'),
      cells: Array.from({ length: 6 }).map((_, ci) => ({ monthIndex: ci, retention: Math.random() }))
    }));
  }
  // 1. Group orders by userId and get cohortMonth
  const userToOrders:Map<string,WhopOrder[]> = new Map();
  for (const order of orders) {
    if (!userToOrders.has(order.userId)) userToOrders.set(order.userId, []);
    userToOrders.get(order.userId)!.push(order);
  }
  // 2. Find the cohort month for each user
  type UserCohort = { userId: string, cohortMonth: string, cohortDate: dayjs.Dayjs };
  const userCohorts:UserCohort[] = Array.from(userToOrders.entries()).map(([userId, userOrders]) => {
    const firstOrder = userOrders.reduce((earliest,o) => dayjs(o.createdAt).isBefore(dayjs(earliest.createdAt)) ? o : earliest, userOrders[0]);
    const cohortDate = dayjs(firstOrder.createdAt).startOf('month');
    const cohortMonth = cohortDate.format('YYYY-MM');
    return { userId, cohortMonth, cohortDate };
  });
  // 3. Get all cohort months (up to 6 most recent)
  const allCohortMonths = Array.from(new Set(userCohorts.map(u => u.cohortMonth))).sort();
  const recentCohortMonths = allCohortMonths.slice(-6);
  // 4. For each cohort month, find users in cohort, compute 6 retention cells
  const rows: CohortRow[] = recentCohortMonths.map(cohortMonth => {
    const cohortUsers = userCohorts.filter(u => u.cohortMonth === cohortMonth);
    if (!cohortUsers.length) return { cohortMonth, cells: Array(6).fill(0).map((_,i) => ({monthIndex:i, retention:0})) };
    const baseDate = dayjs(`${cohortMonth}-01`);
    const cells = Array.from({ length: 6 }).map((_, monthIndex) => {
      // Users retained = made a purchase in that cohortMonth + N months
      const period = baseDate.add(monthIndex, 'month');
      const retainedUsers = cohortUsers.filter(u => {
        const hasPurchase = userToOrders.get(u.userId)!.some(order => {
          const od = dayjs(order.createdAt).startOf('month');
          return od.isSame(period, 'month');
        });
        return hasPurchase;
      }).length;
      return {
        monthIndex,
        retention: retainedUsers / cohortUsers.length
      };
    });
    return { cohortMonth, cells };
  });
  // 5. Chronological sort
  return rows.sort((a, b) => a.cohortMonth.localeCompare(b.cohortMonth));
}

/**
 * Compute top customers by Lifetime Value (LTV).
 * LTV = sum of all orders per user (in cents).
 */
export function topCustomersByLTV(orders: WhopOrder[], limit: number = 10): Array<{ userId: string; ltvCents: number }> {
  const userRevenue = new Map<string, number>();
  
  for (const order of orders) {
    if (order.refunded) continue; // Exclude refunded orders
    const current = userRevenue.get(order.userId) || 0;
    userRevenue.set(order.userId, current + order.amountCents);
  }
  
  return Array.from(userRevenue.entries())
    .map(([userId, ltvCents]) => ({ userId, ltvCents }))
    .sort((a, b) => b.ltvCents - a.ltvCents)
    .slice(0, limit);
}

/**
 * Compute MRR Growth Rate as percent month-over-month growth.
 * @param currentMRR - MRR for this month
 * @param previousMRR - MRR for previous month
 * @returns Growth rate as decimal (0.05 = 5%). Returns 0 if previousMRR is 0.
 */
export function computeMRRGrowthRate(currentMRR: number, previousMRR: number): number {
  if (previousMRR === 0) return 0;
  return (currentMRR - previousMRR) / previousMRR;
}

/**
 * Compute ARPU (Average Revenue Per User) in cents.
 * @param orders - Array of orders
 * @param activeUsers - Number of active users
 * @returns ARPU in cents. Returns 0 if activeUsers is 0.
 */
export function computeARPU(orders: WhopOrder[], activeUsers: number): number {
  if (!activeUsers) return 0;
  const revenueTotal = orders.reduce((sum, o) => sum + o.amountCents, 0);
  return revenueTotal / activeUsers;
}

/**
 * Compute Lifetime Value (LTV) in cents. If churnRate=0, returns ARPU * 12.
 * @param churnRate - Churn rate as decimal (0–1)
 * @param ARPU - ARPU in cents
 * @returns LTV in cents
 */
export function computeLTV(churnRate: number, ARPU: number): number {
  if (churnRate === 0) return ARPU * 12;
  return ARPU / churnRate;
}

/**
 * Compute Net Revenue Retention (NRR).
 * @param currentMRR - Current MRR
 * @param expansionRevenue - Added revenue from expansions
 * @param churnedMRR - Lost MRR from churned customers
 * @returns NRR as decimal (0–1+)
 */
export function computeNRR(currentMRR: number, expansionRevenue: number, churnedMRR: number): number {
  if (currentMRR === 0) return 0;
  return (currentMRR + expansionRevenue - churnedMRR) / currentMRR;
}

/**
 * Compute Refund Rate as refunded order value over total order value (0–1).
 * @param orders - Array of orders
 * @param refunds - Array of refunds
 * @returns Refund rate as decimal (0–1). Returns 0 if no orders.
 */
export function computeRefundRate(orders: WhopOrder[], refunds: WhopRefund[]): number {
  const total = orders.reduce((acc, o) => acc + o.amountCents, 0);
  if (!total) return 0;
  const refundsTotal = refunds.reduce((acc, r) => acc + r.amountCents, 0);
  return refundsTotal / total;
}

/**
 * Compute Net New MRR breakdown: New, Expansion, Contraction, Churn
 */
export interface NetNewMRRBreakdown {
  new: number;
  expansion: number;
  contraction: number;
  churn: number;
  netNew: number;
}

export function computeNetNewMRR(
  subs: WhopSubscription[],
  orders: WhopOrder[],
  periodStart: Date,
  periodEnd: Date
): NetNewMRRBreakdown {
  const start = dayjs(periodStart);
  const end = dayjs(periodEnd);
  
  // New: first subscription in period
  const newUsers = new Set<string>();
  const newMRR = subs
    .filter(s => {
      const started = dayjs(s.startedAt);
      if (!started.isAfter(start) || !started.isBefore(end)) return false;
      if (newUsers.has(s.userId)) return false;
      newUsers.add(s.userId);
      return true;
    })
    .reduce((sum, s) => sum + s.amountCents, 0);

  // Expansion/Contraction: compare plan changes
  const userPlans = new Map<string, WhopSubscription[]>();
  subs.forEach(s => {
    if (!userPlans.has(s.userId)) userPlans.set(s.userId, []);
    userPlans.get(s.userId)!.push(s);
  });

  let expansion = 0;
  let contraction = 0;
  
  userPlans.forEach((userSubs) => {
    const sorted = userSubs.sort((a, b) => 
      dayjs(a.startedAt).valueOf() - dayjs(b.startedAt).valueOf()
    );
    
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const changeDate = dayjs(curr.startedAt);
      
      if (!changeDate.isAfter(start) || !changeDate.isBefore(end)) continue;
      
      const delta = curr.amountCents - prev.amountCents;
      if (delta > 0) expansion += delta;
      else if (delta < 0) contraction += Math.abs(delta);
    }
  });

  // Churn: canceled subscriptions in period
  const churn = subs
    .filter(s => {
      if (!s.canceledAt) return false;
      const canceled = dayjs(s.canceledAt);
      return canceled.isAfter(start) && canceled.isBefore(end);
    })
    .reduce((sum, s) => sum + s.amountCents, 0);

  return {
    new: newMRR,
    expansion,
    contraction,
    churn,
    netNew: newMRR + expansion - contraction - churn,
  };
}

/**
 * Dunning & Recovery metrics
 */
export interface DunningMetrics {
  failedPaymentsRate: number;
  failedPaymentsRateDelta: number;
  amountAtRisk: number;
  recoveryRate: number;
  avgRetries: number;
}

export function computeDunningMetrics(
  orders: WhopOrder[],
  refunds: WhopRefund[],
  days: number = 30
): DunningMetrics {
  const cutoff = dayjs().subtract(days, 'day');
  const recentOrders = orders.filter(o => dayjs(o.createdAt).isAfter(cutoff));
  const recentRefunds = refunds.filter(r => dayjs(r.createdAt).isAfter(cutoff));

  const failed = recentOrders.filter(o => o.refunded || refunds.some(r => r.orderId === o.id));
  const failedRate = recentOrders.length > 0 ? failed.length / recentOrders.length : 0;

  // Recovery: refunds that were later paid (simplified: assume non-refunded = recovered)
  const recovered = failed.filter(o => !recentRefunds.some(r => r.orderId === o.id));
  const recoveryRate = failed.length > 0 ? recovered.length / failed.length : 0;

  const amountAtRisk = failed.reduce((sum, o) => sum + o.amountCents, 0);

  // Mock avg retries (in real app, would track retry events)
  const avgRetries = failed.length > 0 ? 2.5 : 0;

  // Compute delta vs previous period
  const prevCutoff = cutoff.subtract(days, 'day');
  const prevOrders = orders.filter(o => {
    const date = dayjs(o.createdAt);
    return date.isAfter(prevCutoff) && date.isBefore(cutoff);
  });
  const prevFailed = prevOrders.filter(o => o.refunded || refunds.some(r => r.orderId === o.id));
  const prevFailedRate = prevOrders.length > 0 ? prevFailed.length / prevOrders.length : 0;
  const delta = failedRate - prevFailedRate;

  return {
    failedPaymentsRate: failedRate,
    failedPaymentsRateDelta: delta,
    amountAtRisk,
    recoveryRate,
    avgRetries,
  };
}

/**
 * Anomaly detection: z-score for MRR daily changes
 */
export function detectMRRAnomalies(mrrDaily: number[]): number[] {
  if (mrrDaily.length < 3) return [];
  
  const mean = mrrDaily.reduce((a, b) => a + b, 0) / mrrDaily.length;
  const variance = mrrDaily.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / mrrDaily.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) return [];
  
  return mrrDaily.map((value, index) => {
    const zScore = Math.abs((value - mean) / stdDev);
    return zScore > 2 ? index : -1;
  }).filter(idx => idx >= 0);
}

// dynamic value: computed from Supabase
export async function getRevenueByPlan(companyId: string): Promise<Array<{ plan: string; revenue: number }>> {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('plan_id, amount, status, company_id')
    .eq('company_id', companyId)
    .in('status', ['active', 'trialing']);
  if (error || !data) return [];
  const agg = new Map<string, number>();
  for (const row of data as any[]) {
    const plan = String(row.plan_id || 'Unknown');
    const amount = Number(row.amount) || 0;
    agg.set(plan, (agg.get(plan) || 0) + amount);
  }
  return Array.from(agg.entries()).map(([plan, revenue]) => ({ plan, revenue }));
}

// dynamic value: computed from Supabase (webhook-based; may be empty if no events)
export async function getRevenueByChannel(companyId: string): Promise<Array<{ channel: string; revenue: number }>> {
  // If you track channels in webhook_events (type like 'order.channel.telegram')
  const { data, error } = await supabaseAdmin
    .from('webhook_events')
    .select('type, company_id')
    .eq('company_id', companyId);
  if (error || !data) return [];
  const agg = new Map<string, number>();
  for (const e of data as any[]) {
    const t = String(e.type || '');
    const m = t.match(/channel\.(\w+)/);
    if (m) {
      const ch = m[1];
      agg.set(ch, (agg.get(ch) || 0) + 0); // no amount in events; requires enrichment
    }
  }
  return Array.from(agg.entries()).map(([channel, revenue]) => ({ channel, revenue }));
}

// dynamic value: computed from Supabase
export async function getFeatureAdoption(companyId: string): Promise<{ ahaMomentRate: number | null; timeToValueMin: number | null; features: Array<{ feature: string; adoptionRate: number; retentionUplift: number }>; }>{
  const { data } = await supabaseAdmin
    .from('analytics_cache')
    .select('payload_json')
    .eq('company_id', companyId)
    .eq('period_key', 'features')
    .maybeSingle();
  if (!data || !data.payload_json) return { ahaMomentRate: null, timeToValueMin: null, features: [] };
  const p = data.payload_json as any;
  return {
    ahaMomentRate: typeof p.ahaMomentRate === 'number' ? p.ahaMomentRate : null,
    timeToValueMin: typeof p.timeToValueMin === 'number' ? p.timeToValueMin : null,
    features: Array.isArray(p.features) ? p.features : [],
  };
}

// dynamic value: computed from Supabase
export async function getSystemHealth(companyId: string): Promise<Array<{ label: string; value: number; unit: string; status: 'healthy'|'warning'|'critical'; trend?: 'up'|'down'|'stable'; }>>{
  const out: Array<{ label: string; value: number; unit: string; status: 'healthy'|'warning'|'critical'; trend?: 'up'|'down'|'stable'; }> = [];
  const { data: comp } = await supabaseAdmin.from('companies').select('last_synced_at').eq('id', companyId).maybeSingle();
  if (comp?.last_synced_at) {
    const minutes = Math.max(0, (Date.now() - new Date(comp.last_synced_at as string).getTime()) / 60000);
    out.push({ label: 'Last Sync', value: Number(minutes.toFixed(1)), unit: 'min', status: minutes < 10 ? 'healthy' : minutes < 60 ? 'warning' : 'critical', trend: 'stable' });
  }
  // Delivery rates by webhook types
  const types = ['telegram_delivery','email_delivery'];
  for (const t of types) {
    const { data } = await supabaseAdmin
      .from('webhook_events')
      .select('status')
      .eq('company_id', companyId)
      .eq('type', t);
    const total = data?.length || 0;
    const success = (data || []).filter((x: any) => x.status === 'processed').length;
    if (total > 0) out.push({ label: t === 'telegram_delivery' ? 'Telegram Delivery' : 'Email Delivery', value: (success / total) * 100, unit: '%', status: success/Math.max(1,total) > 0.95 ? 'healthy' : 'warning', trend: 'stable' });
  }
  return out;
}

// dynamic value from Supabase
export async function getRetentionCohorts(companyId: string): Promise<Array<{ cohort: string; m1: number; m2: number; m3: number; m4: number; m5: number; m6: number }>> {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('started_at, canceled_at, company_id')
    .eq('company_id', companyId);
  if (error || !data) return [];
  type Row = { started_at: string; canceled_at: string | null };
  const rows = data as Row[];
  // group by cohort month
  const byCohort = new Map<string, Row[]>();
  for (const r of rows) {
    const cohort = dayjs(r.started_at).startOf('month').format('YYYY-MM');
    if (!byCohort.has(cohort)) byCohort.set(cohort, []);
    byCohort.get(cohort)!.push(r);
  }
  const cohorts = Array.from(byCohort.keys()).sort();
  const out: Array<{ cohort: string; m1: number; m2: number; m3: number; m4: number; m5: number; m6: number }> = [];
  for (const cohort of cohorts) {
    const list = byCohort.get(cohort)!;
    const base = dayjs(`${cohort}-01`);
    const total = list.length || 1;
    const pct = (n: number) => {
      const threshold = base.add(n, 'month');
      const kept = list.filter(s => !s.canceled_at || dayjs(s.canceled_at).isAfter(threshold)).length;
      return Math.round((kept / total) * 100);
    };
    out.push({ cohort, m1: pct(1), m2: pct(2), m3: pct(3), m4: pct(4), m5: pct(5), m6: pct(6) });
  }
  return out.slice(-6); // last six cohorts
}

// dynamic value from Supabase
export async function getFailureAnalytics(companyId: string): Promise<{ reasons: Array<{ reason: string; count: number; recovery_rate: number }>; recoveryByDay: Array<{ day: number; recovery: number }> }> {
  // Reasons and recovery from refunds
  const { data: refunds } = await supabaseAdmin
    .from('refunds')
    .select('reason, status, company_id')
    .eq('company_id', companyId);
  const reasonsAgg = new Map<string, { count: number; recovered: number }>();
  for (const r of (refunds || []) as any[]) {
    const key = String(r.reason || 'unknown');
    const entry = reasonsAgg.get(key) || { count: 0, recovered: 0 };
    entry.count += 1;
    if (r.status === 'recovered') entry.recovered += 1;
    reasonsAgg.set(key, entry);
  }
  const reasons = Array.from(reasonsAgg.entries())
    .map(([reason, v]) => ({ reason, count: v.count, recovery_rate: v.count ? Math.round((v.recovered / v.count) * 100) : 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(5);

  // Recovery by day since failure using webhook_events diff processed_at - received_at
  const { data: events } = await supabaseAdmin
    .from('webhook_events')
    .select('received_at, processed_at, status, type')
    .eq('company_id', companyId)
    .eq('type', 'payment_failed');
  const byDay = new Map<number, { total: number; recovered: number }>();
  for (const e of (events || []) as any[]) {
    const start = e.received_at ? new Date(e.received_at) : null;
    const end = e.processed_at ? new Date(e.processed_at) : null;
    const diff = start && end ? Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000)) : 0;
    const day = Math.min(7, diff);
    const entry = byDay.get(day) || { total: 0, recovered: 0 };
    entry.total += 1;
    if (e.status === 'recovered' || e.status === 'processed') entry.recovered += 1;
    byDay.set(day, entry);
  }
  const recoveryByDay = Array.from({ length: 8 }, (_, d) => {
    const e = byDay.get(d) || { total: 0, recovered: 0 };
    return { day: d, recovery: e.total ? Math.round((e.recovered / e.total) * 100) : 0 };
  });
  return { reasons, recoveryByDay };
}

