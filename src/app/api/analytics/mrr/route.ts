import { NextResponse } from 'next/server';
import { getMRRTrends } from '@/lib/analytics';
import { parseCompanyId } from '@/lib/validate';
import dayjs from 'dayjs';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const cid = url.searchParams.get('companyId');
    if (!cid) return NextResponse.json({ error: 'companyId required' }, { status: 400 });
    const companyId = parseCompanyId(cid);
    
    // Get current period (current month)
    const now = new Date();
    const currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    // Get current period breakdown
    const current = await getMRRTrends(companyId, currentPeriodStart, currentPeriodEnd);
    
    // Get monthly breakdown for last 12 months
    const monthly: Array<{
      month: string;
      new: number;
      expansion: number;
      contraction: number;
      churn: number;
    }> = [];
    
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const breakdown = await getMRRTrends(companyId, monthStart, monthEnd);
      monthly.push({
        month: dayjs(monthStart).format('YYYY-MM'),
        new: breakdown.new,
        expansion: breakdown.expansion,
        contraction: breakdown.contraction,
        churn: breakdown.churn,
      });
    }
    
    return NextResponse.json({
      current,
      monthly,
    });
  } catch (error: any) {
    console.error('[MRR API] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to compute MRR trends' },
      { status: 500 }
    );
  }
}

