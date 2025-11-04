import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { whopsdk } from "@/lib/whop-sdk";
import ClientDashboard from "./pageClient";

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId?: string | string[] | undefined }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await params;
  const sp = await searchParams;
  const companyId = Array.isArray(resolved?.companyId)
    ? resolved?.companyId?.[0]
    : resolved?.companyId;

  if (!companyId) {
    const fallbackId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;
    if (fallbackId) {
      redirect(`/dashboard/${fallbackId}`);
    }
    return (
      <div style={{ padding: 20 }}>
        <p>Missing company id</p>
      </div>
    );
  }

  const hdrsAny: any = await headers();
  console.log("[Whop] Incoming headers snapshot", {
    hasGet: typeof hdrsAny?.get === 'function',
    whopTokenPresent: typeof hdrsAny?.get === 'function' ? !!hdrsAny.get('whop-token') : false,
    authorizationPresent: typeof hdrsAny?.get === 'function' ? !!hdrsAny.get('authorization') : false,
  });
  const getHeader = typeof hdrsAny?.get === 'function' ? (k: string) => hdrsAny.get(k) : (_k: string) => undefined;
  const host = (getHeader('host') || '').toLowerCase();
  const shouldVerify = host.endsWith('.apps.whop.com') || host.endsWith('.whop.com');

  let allow = true;
  if (shouldVerify) {
    try {
      const token = getHeader('whop-token');
      if (!token) {
        console.log('⚠️ No Whop token found in headers');
      }
      const { userId } = await whopsdk.verifyUserToken(hdrsAny);
      console.log('✅ User verified', { userId });
      const hasAccess = await whopsdk.users.checkAccess(companyId, { id: userId });
      allow = !!hasAccess;
      console.log('🔐 Access check', { companyId, allow });
    } catch (e) {
      console.error('❌ Token verification failed', e);
      allow = false;
    }
  }

  if (!allow) {
    return (
      <div style={{ padding: 20 }}>
        <p>Unauthorized: no access to this company</p>
      </div>
    );
  }

  return <ClientDashboard companyId={companyId} embedded={shouldVerify} />;
}

