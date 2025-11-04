import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const requiredEnv = [
    'WHOP_API_KEY',
    'NEXT_PUBLIC_WHOP_APP_ID',
  ];

  const optionalEnv = [
    'WHOP_WEBHOOK_SECRET',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DISCORD_WEBHOOK_URL',
    'OPENROUTER_API_KEY',
  ];

  const envStatus: Record<string, boolean> = {};
  for (const key of requiredEnv) envStatus[key] = !!process.env[key];
  for (const key of optionalEnv) envStatus[key] = !!process.env[key];

  const ok = requiredEnv.every((k) => envStatus[k]);

  return NextResponse.json({
    ok,
    env: envStatus,
    notes: 'ok indicates all required env vars are present',
  });
}


