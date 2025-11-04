// --- DEBUG HOOKS: This API route will log env/requests for dev testing. Remove logs before deploying to prod! ---
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { RevenueKPIs, CohortRow } from '@/lib/types';

// Utility to redact secret URLs
type AnyDict = Record<string, any>;
function redactWebhook(url?: string) {
  if (!url) return '<undefined>';
  // show first 8 and last 6 chars
  if (url.length <= 16) return url[0]+"***"+url.slice(-2);
  return url.slice(0,8) + '…' + url.slice(-6);
}

if (typeof process !== 'undefined' && process.env) {
  // Print out env on first load (on server only), but redact webhook
  const shown: AnyDict = {...process.env};
  if (shown.DISCORD_WEBHOOK_URL) shown.DISCORD_WEBHOOK_URL = redactWebhook(shown.DISCORD_WEBHOOK_URL);
  console.log('[Digest API] process.env snapshot:', shown);
}

console.log("✅ Digest route loaded");
if (typeof process !== 'undefined') {
  console.log('[Digest API] startup DISCORD_WEBHOOK_URL:', redactWebhook(process.env.DISCORD_WEBHOOK_URL));
}

/**
 * Форматирует KPI в читаемый Discord-сообщение
 */
function formatDigestMessage(kpis: RevenueKPIs): string {
  const lines = [
    '**Revenue Digest**',
    `MRR: $${(kpis.mrr / 100).toFixed(2)}`,
    `ARR: $${(kpis.arr / 100).toFixed(2)}`,
    `Churn: ${(kpis.churnRate * 100).toFixed(1)}%`,
    `Failed: ${(kpis.failedPaymentsRate * 100).toFixed(1)}%`,
  ];
  if ((kpis as any).nrr !== undefined) {
    lines.push(`NRR: ${((kpis as any).nrr * 100).toFixed(1)}%`);
  }
  return lines.join('\n');
}

export async function GET() {
  // For easy health check and env var check
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  const redacted = redactWebhook(webhook);
  console.log('[Digest API GET] DISCORD_WEBHOOK_URL:', redacted);
  return NextResponse.json({ webhookFound: !!webhook, webhook: redacted });
}

export async function POST(req: Request) {
  try {
    const webhook = process.env.DISCORD_WEBHOOK_URL;
    const redacted = redactWebhook(webhook);
    console.log("[Digest API] Received POST | webhook env:", redacted);
    const { kpis, cohortPreview, send }: { kpis: RevenueKPIs; cohortPreview: CohortRow[]; send: boolean } = await req.json();

    console.log('[Digest API] send:', send, '| webhook set:', !!webhook);
    console.log('[Digest API] KPIs:', kpis);

    if (send && webhook) {
      const message = formatDigestMessage(kpis);

      const res = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message }),
      });

      console.log('[Discord webhook response]', res.status, res.statusText);
      if (!res.ok) {
        const errText = await res.text();
        console.error('[Discord webhook failed]:', errText);
        return NextResponse.json({ sent: false, error: `Discord error ${res.status}` });
      }
      return NextResponse.json({ sent: true });
    } else {
      console.warn('[Digest API] Webhook not configured or send=false');
      return NextResponse.json({ sent: false });
    }
  } catch (error: any) {
    console.error('[Digest API] Error:', error);
    return NextResponse.json({ sent: false, error: error?.message || 'Unknown error' });
  }
}
