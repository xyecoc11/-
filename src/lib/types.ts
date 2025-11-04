export type WhopSubscription = { id: string; userId: string; planId: string; amountCents: number; currency: string; status: string; startedAt: string; currentPeriodEnd: string; canceledAt?: string };

export type WhopOrder = { id: string; userId: string; amountCents: number; currency: string; createdAt: string; refunded: boolean };

export type WhopRefund = { id: string; orderId: string; amountCents: number; createdAt: string };

export type RevenueKPIs = { mrr: number; arr: number; churnRate: number; failedPaymentsRate: number };

export type CohortRow = { cohortMonth: string; cells: { monthIndex: number; retention: number }[] };

export type Insight = { title: string; body: string; severity: 'info' | 'warn' | 'critical' };
