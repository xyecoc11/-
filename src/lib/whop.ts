import { supabase } from './db';
import subs from '../../scripts/fixtures/subscriptions_30d.json';
import orders from '../../scripts/fixtures/orders_90d.json';
import refunds from '../../scripts/fixtures/refunds_90d.json';
import type { WhopSubscription, WhopOrder, WhopRefund } from './types';

export async function fetchSubscriptions(days: number = 90): Promise<WhopSubscription[]> {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    console.log('[Whop Fetch] Using Supabase');
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .gte('startedAt', cutoff.toISOString());
    return data as WhopSubscription[] || [];
  } else {
    console.log('[Whop Fetch] Using Fixtures');
    return subs;
  }
}

export async function fetchOrders(days: number = 90): Promise<WhopOrder[]> {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    console.log('[Whop Fetch] Using Supabase');
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .gte('createdAt', cutoff.toISOString());
    return data as WhopOrder[] || [];
  } else {
    console.log('[Whop Fetch] Using Fixtures');
    return orders;
  }
}

export async function fetchRefunds(days: number = 90): Promise<WhopRefund[]> {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    console.log('[Whop Fetch] Using Supabase');
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const { data } = await supabase
      .from('refunds')
      .select('*')
      .gte('createdAt', cutoff.toISOString());
    return data as WhopRefund[] || [];
  } else {
    console.log('[Whop Fetch] Using Fixtures');
    return refunds;
  }
}
