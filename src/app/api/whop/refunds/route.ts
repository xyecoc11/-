import { NextResponse } from 'next/server';
import { fetchRefunds } from '@/lib/whop';
import { parseCompanyId, parseDays } from '@/lib/validate';
import { apiKeyGuard } from '@/lib/guard';

export async function GET(req: Request) {
  const guardError = apiKeyGuard();
  if (guardError) return guardError;

  try {
    const url = new URL(req.url);
    const days = parseDays(url.searchParams.get('days'));
    const companyIdParam = url.searchParams.get('companyId');
    if (!companyIdParam) return NextResponse.json({ error: 'companyId required' }, { status: 400 });
    const companyId = parseCompanyId(companyIdParam);
    const data = await fetchRefunds(days, companyId);
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to fetch refunds' }, { status: 500 });
  }
}
