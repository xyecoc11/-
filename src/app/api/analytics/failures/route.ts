import { NextResponse } from 'next/server';
import { getFailureAnalytics } from '@/lib/analytics';
import { parseCompanyId } from '@/lib/validate';
import { supabaseAdmin } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const cid = url.searchParams.get('companyId');
    if (!cid) return NextResponse.json({ error: 'companyId required' }, { status: 400 });
    const companyId = parseCompanyId(cid);

    // Get summary from v_failures view
    const { data: summary, error: summaryError } = await supabaseAdmin
      .from('v_failures')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle();

    if (summaryError) {
      console.error('[Failures API] Error loading v_failures:', summaryError);
    }

    // Get reasons from v_failure_reasons view
    const { data: reasonsData, error: reasonsError } = await supabaseAdmin
      .from('v_failure_reasons')
      .select('*')
      .eq('company_id', companyId);

    if (reasonsError) {
      console.error('[Failures API] Error loading v_failure_reasons:', reasonsError);
    }

    // Format reasons data for response
    const formattedReasons = Array.isArray(reasonsData)
      ? reasonsData.map((r: any) => ({
          reason: r.reason || 'unknown',
          count: Number(r.count ?? 0),
          recovery_rate:
            r.recovery_rate !== null && r.recovery_rate !== undefined
              ? parseFloat(String(r.recovery_rate))
              : 0,
        }))
      : [];

    // Get recoveryByDay from getFailureAnalytics
    const { recoveryByDay: recoveryByDayData } = await getFailureAnalytics(companyId);

    // Compute average recovery rate: if summary.recovery_rate is 0 but reasonsData has values, use avg of reasons
    const summaryRecoveryRate = Number(summary?.recovery_rate || 0);
    const avgRecovery = (summaryRecoveryRate === 0 && formattedReasons?.length > 0)
      ? formattedReasons.reduce((s: number, r: any) => s + Number(r.recovery_rate || 0), 0) / formattedReasons.length
      : summaryRecoveryRate;

    return NextResponse.json({
      failedPayments: Number(summary?.failed_count || 0),
      atRisk: Number(summary?.at_risk || 0),
      recoveredPayments: Number(summary?.recovered_count || 0),
      recoveryRate: Math.round(avgRecovery),
      avgRetries: Number(summary?.avg_retry_time ?? 0),
      reasons: formattedReasons,
      recoveryByDay: recoveryByDayData || [],
    });
  } catch (error: any) {
    console.error('[Failures API] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch failure analytics' },
      { status: 500 }
    );
  }
}


