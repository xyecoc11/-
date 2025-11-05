import { NextResponse } from 'next/server';
import { parseCompanyId } from '@/lib/validate';
import { getFeatureAdoption } from '@/lib/analytics';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cid = url.searchParams.get('companyId');
  if (!cid) return NextResponse.json({ error: 'companyId required' }, { status: 400 });
  const companyId = parseCompanyId(cid);
  const data = await getFeatureAdoption(companyId);
  return NextResponse.json(data);
}


