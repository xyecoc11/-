import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { whopsdk } from "@/lib/whop-sdk";
import ClientDashboard from "./pageClient";

export default async function DashboardPage({
  params,
}: {
  params?: { companyId?: string | string[] | undefined };
}) {
  const companyId = Array.isArray(params?.companyId)
    ? params?.companyId?.[0]
    : params?.companyId;

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

  const hdrs = await headers();
  const { userId } = await whopsdk.verifyUserToken(hdrs);
  const hasAccess = await whopsdk.users.checkAccess(companyId, { id: userId });
  if (!hasAccess) {
    return (
      <div style={{ padding: 20 }}>
        <p>Unauthorized: no access to this company</p>
      </div>
    );
  }

  return <ClientDashboard companyId={companyId} />;
}

