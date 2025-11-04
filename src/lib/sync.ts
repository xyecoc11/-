import { supabaseAdmin } from './db';
import { whopsdk } from './whop-sdk';

type UpsertOptions = { onConflict?: string };

async function upsert(table: string, rows: any[], options?: UpsertOptions) {
  if (!rows || rows.length === 0) return;
  const { error } = await supabaseAdmin.from(table).upsert(rows, { onConflict: options?.onConflict });
  if (error) throw error;
}

export async function syncCompany(companyId: string, days: number = 90) {
  // Simple lock to avoid concurrent syncs for the same company
  const { data: lock, error: lockErr } = await supabaseAdmin
    .from('sync_locks')
    .insert({ company_id: companyId })
    .select('company_id')
    .single();
  if (lockErr && !String(lockErr.message).includes('duplicate')) {
    throw lockErr;
  }
  const releaseLock = async () => {
    await supabaseAdmin.from('sync_locks').delete().eq('company_id', companyId);
  };
  // Placeholder: pull from Whop SDK once endpoints are available; for now, rely on whopsdk.* or add your own client wrappers.
  // Example pseudo-calls:
  // const subs = await whopsdk.subscriptions.list({ company_id: companyId, days });
  // const orders = await whopsdk.orders.list({ company_id: companyId, days });
  // const refunds = await whopsdk.refunds.list({ company_id: companyId, days });

  // Here we conservatively no-op if SDK routes are unavailable. Integrate when ready.
  const subs: any[] = [];
  const orders: any[] = [];
  const refunds: any[] = [];

  // Normalize records to include company_id
  const normSubs = subs.map((s) => ({ ...s, company_id: companyId }));
  const normOrders = orders.map((o) => ({ ...o, company_id: companyId }));
  const normRefunds = refunds.map((r) => ({ ...r, company_id: companyId }));

  try {
    await upsert('subscriptions', normSubs, { onConflict: 'id' });
    await upsert('orders', normOrders, { onConflict: 'id' });
    await upsert('refunds', normRefunds, { onConflict: 'id' });

    await supabaseAdmin
      .from('companies')
      .upsert({ id: companyId, last_synced_at: new Date().toISOString() }, { onConflict: 'id' });
  } finally {
    await releaseLock();
  }
}


