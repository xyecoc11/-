// src/app/api/proxy/sardine/route.ts
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const path = url.searchParams.get('path') || '/v1/ping'; // пример
  
  try {
    const r = await fetch(`https://api.sardine.ai${path}`, {
      headers: { 
        Authorization: `Bearer ${process.env.SARDINE_KEY || ''}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    
    const data = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Proxy error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const path = url.searchParams.get('path') || '/v1/ping';
  const body = await req.json().catch(() => ({}));
  
  try {
    const r = await fetch(`https://api.sardine.ai${path}`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${process.env.SARDINE_KEY || ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    
    const data = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Proxy error' },
      { status: 500 }
    );
  }
}

// Обработка preflight для CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://whop.com',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

