import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const host = request.headers.get('host') || '';

  // Build base response and ensure CORS/iframe-related headers for Whop
  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', 'https://whop.com');
  response.headers.set('Access-Control-Allow-Headers', 'Authorization, whop-token, Content-Type');
  response.headers.set('Access-Control-Allow-Credentials', 'true');

  // Do not perform redirects when embedded in Whop apps domain to avoid loops
  if (host.endsWith('.apps.whop.com') || host.endsWith('.whop.com')) {
    return response;
  }

  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    const companyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;
    if (companyId) {
      const url = request.nextUrl.clone();
      url.pathname = `/dashboard/${companyId}`;
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  // Apply on all routes so headers are present for SSR/API when embedded via Whop
  matcher: ['/((?!_next/|favicon.ico).*)'],
};


