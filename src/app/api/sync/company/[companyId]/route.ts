import { NextResponse } from 'next/server';
import { syncCompany } from '@/lib/sync';

export const runtime = 'nodejs';

export async function GET(_req: Request, ctx: { params: { companyId: string } }) {
  const companyId = ctx.params.companyId;
  if (!companyId) return NextResponse.json({ error: 'Missing companyId' }, { status: 400 });
  try {
    await syncCompany(companyId, 90);
    return NextResponse.json({ ok: true, companyId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Sync failed' }, { status: 500 });
  }
}


