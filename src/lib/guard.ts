import { NextResponse } from 'next/server';

/**
 * Validates WHOP_API_KEY presence in server environment.
 * Returns NextResponse with 401 if missing/invalid, null if OK.
 */
export function apiKeyGuard(): NextResponse | null {
  const key = process.env.WHOP_API_KEY;
  if (!key || key.trim() === '') {
    return NextResponse.json(
      { error: 'Missing or invalid WHOP_API_KEY' },
      { status: 401 }
    );
  }
  return null;
}

