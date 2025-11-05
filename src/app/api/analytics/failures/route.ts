import { NextResponse } from 'next/server';
import { getFailureAnalytics } from '@/lib/analytics';
import { parseCompanyId } from '@/lib/validate';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cid = url.searchParams.get('companyId');
  if (!cid) return NextResponse.json({ error: 'companyId required' }, { status: 400 });
  const companyId = parseCompanyId(cid);
  // dynamic value from Supabase
  const data = await getFailureAnalytics(companyId);
  return NextResponse.json(data);
}


