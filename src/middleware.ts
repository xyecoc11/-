import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    const companyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;
    if (companyId) {
      const url = request.nextUrl.clone();
      url.pathname = `/dashboard/${companyId}`;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard', '/dashboard/'],
};


