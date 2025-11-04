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
  const getHeader = typeof hdrsAny?.get === 'function' ? (k: string) => hdrsAny.get(k) : (_k: string) => undefined;
  const host = (getHeader('host') || '').toLowerCase();
  const shouldVerify = host.endsWith('.apps.whop.com') || host.endsWith('.whop.com');

  let allow = true;
  if (shouldVerify) {
    try {
      const { userId } = await whopsdk.verifyUserToken(hdrsAny);
      const hasAccess = await whopsdk.users.checkAccess(companyId, { id: userId });
      allow = !!hasAccess;
    } catch (e) {
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

  return <ClientDashboard companyId={companyId} />;
}

