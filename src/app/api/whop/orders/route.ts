import { NextResponse } from 'next/server';
import { fetchOrders } from '@/lib/whop';
import { apiKeyGuard } from '@/lib/guard';

export async function GET(req: Request) {
  const guardError = apiKeyGuard();
  if (guardError) return guardError;

  try {
    const url = new URL(req.url);
    const days = Math.min(parseInt(url.searchParams.get('days') || '90', 10), 365);
    const data = await fetchOrders(days);
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to fetch orders' }, { status: 500 });
  }
}
