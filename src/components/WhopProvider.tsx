'use client';

import { WhopIframeSdkProvider } from '@whop/react';

export function WhopAppProvider({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_WHOP_APP_ID;
  if (!appId) return <>{children}</>;
  return (
    <WhopIframeSdkProvider options={{ appId }}>
      {children}
    </WhopIframeSdkProvider>
  );
}

