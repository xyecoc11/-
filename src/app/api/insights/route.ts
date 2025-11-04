import { NextResponse } from 'next/server';
import type { RevenueKPIs, Insight } from '@/lib/types';
import { summarizeTrends } from '@/lib/ai';

function mockInsights(): Insight[] {
  return [
    {
      title: 'Spike in Churn',
      body: 'Churn rate increased by 2% this month. Consider reaching out to recently lost users for feedback.',
      severity: 'warn',
    },
    {
      title: 'Failed Payments Trending Up',
      body: 'Failed payment rate is higher than average. Check payment processor and notify impacted users.',
      severity: 'info',
    },
    {
      title: 'MRR Stable',
      body: 'Monthly recurring revenue remains steady despite churn fluctuations.',
      severity: 'info',
    },
  ];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { kpis, notes } = body;
    if (!kpis || typeof kpis !== 'object') {
      return NextResponse.json({ error: 'Missing or invalid kpis' }, { status: 400 });
    }
    let insights: Insight[];
    if (process.env.OPENROUTER_API_KEY) {
      insights = await summarizeTrends(kpis, notes);
    } else {
      insights = mockInsights();
    }
    return NextResponse.json({ insights });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
