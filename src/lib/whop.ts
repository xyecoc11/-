import { supabase } from './db';
import subs from '../../scripts/fixtures/subscriptions_30d.json';
import orders from '../../scripts/fixtures/orders_90d.json';
import refunds from '../../scripts/fixtures/refunds_90d.json';
import type { WhopSubscription, WhopOrder, WhopRefund } from './types';

export async function fetchSubscriptions(days: number = 90, companyId?: string): Promise<WhopSubscription[]> {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    console.log('[Whop Fetch] Using Supabase');
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    let query = supabase
      .from('subscriptions')
      .select('*')
      .gte('startedAt', cutoff.toISOString());
    if (companyId) query = query.eq('companyId', companyId).eq('company_id', companyId);
    const { data } = await query;
    return data as WhopSubscription[] || [];
  } else {
    console.log('[Whop Fetch] Using Fixtures');
    return (subs as any[]).filter((s: any) => !companyId || s.companyId === companyId || s.company_id === companyId) as WhopSubscription[];
  }
}

export async function fetchOrders(days: number = 90, companyId?: string): Promise<WhopOrder[]> {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    console.log('[Whop Fetch] Using Supabase');
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    let query = supabase
      .from('orders')
      .select('*')
      .gte('createdAt', cutoff.toISOString());
    if (companyId) query = query.eq('companyId', companyId).eq('company_id', companyId);
    const { data } = await query;
    return data as WhopOrder[] || [];
  } else {
    console.log('[Whop Fetch] Using Fixtures');
    return (orders as any[]).filter((o: any) => !companyId || o.companyId === companyId || o.company_id === companyId) as WhopOrder[];
  }
}

export async function fetchRefunds(days: number = 90, companyId?: string): Promise<WhopRefund[]> {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    console.log('[Whop Fetch] Using Supabase');
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    let query = supabase
      .from('refunds')
      .select('*')
      .gte('createdAt', cutoff.toISOString());
    if (companyId) query = query.eq('companyId', companyId).eq('company_id', companyId);
    const { data } = await query;
    return data as WhopRefund[] || [];
  } else {
    console.log('[Whop Fetch] Using Fixtures');
    return (refunds as any[]).filter((r: any) => !companyId || r.companyId === companyId || r.company_id === companyId) as WhopRefund[];
  }
}

export async function getCompanyData(companyId: string, days: number = 90): Promise<{
  subscriptions: WhopSubscription[];
  orders: WhopOrder[];
  refunds: WhopRefund[];
}> {
  const [subscriptions, ordersData, refundsData] = await Promise.all([
    fetchSubscriptions(days, companyId),
    fetchOrders(days, companyId),
    fetchRefunds(days, companyId),
  ]);
  return { subscriptions, orders: ordersData, refunds: refundsData };
}
