import { NextResponse } from 'next/server';
import { getRevenueByPlan, getRevenueByChannel } from '@/lib/analytics';
import { parseCompanyId } from '@/lib/validate';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cid = url.searchParams.get('companyId');
  if (!cid) return NextResponse.json({ error: 'companyId required' }, { status: 400 });
  const companyId = parseCompanyId(cid);
  const [plan, channel] = await Promise.all([
    getRevenueByPlan(companyId),
    getRevenueByChannel(companyId),
  ]);
  return NextResponse.json({ plan, channel });
}


