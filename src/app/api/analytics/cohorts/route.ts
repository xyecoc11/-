import { NextResponse } from 'next/server';
import { getRetentionCohorts } from '@/lib/analytics';
import { parseCompanyId } from '@/lib/validate';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cid = url.searchParams.get('companyId');
  if (!cid) return NextResponse.json({ error: 'companyId required' }, { status: 400 });
  const companyId = parseCompanyId(cid);
  // dynamic value from Supabase
  const raw = await getRetentionCohorts(companyId);
  const formatted = (raw || []).map((r: any) => ({
    cohortMonth: r.cohort,
    cells: [r.m1, r.m2, r.m3, r.m4, r.m5, r.m6].map((v: number, idx: number) => ({
      monthIndex: idx,
      retention: typeof v === 'number' ? v / 100 : 0,
    })),
  }));
  return NextResponse.json({ cohorts: formatted });
}


