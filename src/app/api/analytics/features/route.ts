import { NextResponse } from 'next/server';
import { parseCompanyId } from '@/lib/validate';
import { getFeatureAdoption, getAdoptionCurve } from '@/lib/analytics';
import { supabaseAdmin } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const cid = url.searchParams.get('companyId');
    if (!cid) return NextResponse.json({ error: 'companyId required' }, { status: 400 });
    const companyId = parseCompanyId(cid);

    // Get adoption curve from v_adoption_curve view
    const { data: curve, error: curveErr } = await supabaseAdmin
      .from('v_adoption_curve')
      .select('day, adoption_pct')
      .eq('company_id', companyId)
      .order('day', { ascending: true });

    // Get features/aha from analytics_cache
    const { data: cache } = await supabaseAdmin
      .from('analytics_cache')
      .select('payload_json')
      .eq('company_id', companyId)
      .eq('period_key', 'features')
      .maybeSingle();

    if (curveErr) {
      console.error('[Features API] Error loading v_adoption_curve:', curveErr);
      return NextResponse.json({ error: curveErr.message }, { status: 500 });
    }

    const payload = cache?.payload_json as any;

    return NextResponse.json({
      curve: (curve || []).map((row: any) => ({
        day: row.day,
        adoption_pct: Number(row.adoption_pct || 0),
      })),
      features: Array.isArray(payload?.features) ? payload.features : [],
      ahaMomentRate: typeof payload?.ahaMomentRate === 'number' ? payload.ahaMomentRate : 0,
      timeToValueMin: typeof payload?.timeToValueMin === 'number' ? payload.timeToValueMin : 0,
    });
  } catch (error: any) {
    console.error('[Features API] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch feature analytics' },
      { status: 500 }
    );
  }
}


