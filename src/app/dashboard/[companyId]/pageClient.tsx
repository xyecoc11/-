"use client";

import { useIframeSdk } from "@whop/react";
import { useEffect } from "react";
import DefaultDashboard from "@/app/dashboard/page";

export default function ClientDashboard({ companyId }: { companyId: string }) {
  const sdk: any = useIframeSdk();
  const { state, company, user } = sdk || {};

  useEffect(() => {
    console.log("[Whop SDK]", { state, company, user });
  }, [state, company, user]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const data = e?.data as any;
      if (data && typeof data === "object" && typeof data.type === "string" && data.type.includes("whop")) {
        console.log("[Whop iframe message]", data);
      }
    };
    console.log("[Iframe check] running inside iframe:", typeof window !== "undefined" && window.parent !== window);
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (state !== "ready") {
    return <p>Loading Whop context...</p>;
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 12 }}>
        <p>Company: {company?.name || companyId || "unknown"}</p>
        <p>User: {user?.email || user?.id || "anonymous"}</p>
      </div>
      <DefaultDashboard />
    </div>
  );
}


