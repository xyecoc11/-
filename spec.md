# Project: Revenue Intelligence for Whop

## Objective
Build an installable Whop app (Next.js 14 + TS) that ingests Whop business data and renders a real-time revenue dashboard with MRR, ARR, churn, retention cohorts, failed payments, top customers, AI insights, and optional Discord daily digest.

## Non-Goals (MVP)
- No multi-tenant org roles beyond owner.
- No custom billing (use Whop billing when applicable).
- No historical backfill > 365 days (MVP: 90 days, configurable).

---

## Tech & Versions (lock these)
- Node `>=18.18.0` (create `.nvmrc` with `18.18.0`)
- Next.js `14.x` (App Router)
- TypeScript `5.x`
- Tailwind CSS `3.x`
- Chart.js `4.x` + `react-chartjs-2`
- zod `3.x` (runtime validation)
- dayjs `^1.x`
- postgres via Supabase (pg `^8.x`)
- OpenAI SDK `^4.x` (or compatible)
- dotenv `^16.x`
- eslint `^9.x` + `@typescript-eslint/*`
- framer-motion `^11.x`

---

## Setup script (Cursor must generate)
- `package.json` with scripts:
  - `dev`: `next dev`
  - `build`: `next build`
  - `start`: `next start`
  - `lint`: `eslint .`
  - `seed`: `ts-node scripts/seed.ts`
- `.nvmrc` = `18.18.0`
- `tsconfig.json` with `"baseUrl":"src"`
- Tailwind init + `src/styles/globals.css`
- `env` files:
  - `.env.local.example` with keys:
    - `WHOP_API_KEY=`
    - `OPENAI_API_KEY=`
    - `SUPABASE_URL=`
    - `SUPABASE_ANON_KEY=`
    - `DATABASE_URL=` (optional if not using Supabase client)
    - `DISCORD_WEBHOOK_URL=` (optional)
- `README.md` with run instructions.

---

## App architecture (folders must exist)
/src
/app
/page.tsx -> Landing (login/connect state + mini KPIs)
/dashboard/page.tsx -> Main dashboard UI
/api/whop/subscriptions/route.ts
/api/whop/orders/route.ts
/api/whop/refunds/route.ts
/api/insights/route.ts -> AI summary
/api/digest/route.ts -> Discord daily digest (POST)
/components
MetricCard.tsx
ChartCard.tsx
RetentionHeatmap.tsx
KPIGrid.tsx
InsightBox.tsx
ErrorState.tsx
LoadingState.tsx
/lib
whop.ts -> Whop fetchers
analytics.ts -> pure functions: MRR, ARR, churn, cohorts, failedRate
ai.ts -> summarizeTrends()
db.ts -> Supabase client (or pg) + simple cache tables
guard.ts -> apiKeyGuard (validate WHOP_API_KEY presence)
types.ts -> shared TypeScript types
/styles
globals.css
/scripts
seed.ts

---

## Data contracts (TypeScript types — implement exactly)
```ts
// src/lib/types.ts
export type WhopSubscription = {
  id: string;
  userId: string;
  planId: string;
  amountCents: number;     // normalized to cents
  currency: string;        // ISO 4217
  status: 'active'|'canceled'|'past_due'|'trialing';
  startedAt: string;       // ISO
  currentPeriodEnd: string;// ISO
  canceledAt?: string;     // ISO
};

export type WhopOrder = {
  id: string;
  userId: string;
  amountCents: number;
  currency: string;
  createdAt: string;       // ISO
  refunded: boolean;
};

export type WhopRefund = {
  id: string;
  orderId: string;
  amountCents: number;
  createdAt: string;
};

export type RevenueKPIs = {
  mrr: number;             // in cents
  arr: number;             // in cents
  churnRate: number;       // 0..1 monthly logical churn
  failedPaymentsRate: number; // 0..1
};

export type CohortCell = { monthIndex: number; retention: number }; // 0..1
export type CohortRow = { cohortMonth: string; cells: CohortCell[] };

export type Insight = { title: string; body: string; severity: 'info'|'warn'|'critical' };
API routes (deterministic behavior)

GET /api/whop/subscriptions

Auth: require process.env.WHOP_API_KEY (server only).

Query: days=90 (default 90; max 365).

Response 200:

{ "data": WhopSubscription[] }


Errors: 401 if missing/invalid key; 500 on fetch error.

GET /api/whop/orders

Same auth & query (days).

Response:

{ "data": WhopOrder[] }


GET /api/whop/refunds

Same auth & query (days).

Response:

{ "data": WhopRefund[] }


POST /api/insights

Body:

{ "kpis": RevenueKPIs, "notes": "optional context" }


Uses OPENAI_API_KEY. Return up to 3 insights:

{ "insights": Insight[] }


POST /api/digest

Body:

{ "kpis": RevenueKPIs, "cohortPreview": CohortRow[], "send": true }


If send=true and DISCORD_WEBHOOK_URL is set, post formatted digest. Always respond 200 with "sent": boolean.

Whop integration wrapper (do NOT hardcode endpoints)

Implement src/lib/whop.ts with placeholder functions that expect a Whop SDK client:

export async function fetchSubscriptions(days=90): Promise<WhopSubscription[]> { /* ... */ }
export async function fetchOrders(days=90): Promise<WhopOrder[]> { /* ... */ }
export async function fetchRefunds(days=90): Promise<WhopRefund[]> { /* ... */ }


Inside, use process.env.WHOP_API_KEY and whichever official SDK method exists. If SDK is unavailable during dev, create a mock layer: read JSON fixtures from /scripts/fixtures/*.json (Cursor must generate 3 example fixtures with realistic shapes).

Analytics functions (pure, unit-testable)

src/lib/analytics.ts

export function computeMRR(subs: WhopSubscription[], at = new Date()): number {}
export function computeARR(mrr: number): number { return mrr * 12; }
export function computeMonthlyChurn(subs: WhopSubscription[], month: Date): number {}
export function computeFailedPaymentsRate(orders: WhopOrder[], refunds: WhopRefund[]): number {}
export function buildRetentionCohorts(orders: WhopOrder[], months = 6): CohortRow {}
export function topCustomersByLTV(orders: WhopOrder[], limit=10): Array<{userId:string; ltvCents:number}> {}


All currency in cents, never floats.

All functions pure, no IO.

Add minimal Jest tests for these.

UI requirements (exact)

/dashboard shows:

KPIGrid: MRR, ARR, Churn, FailedPayments

Line chart: revenue by month (last 6–12)

Heatmap: retention cohorts (6 rows × 6 cols)

InsightBox: results from /api/insights

Table: Top 10 customers (userId, LTV in currency)

Dark theme default; responsive down to 360px width.

Empty/Loading/Error states must be implemented.

AI insights (deterministic prompt)

src/lib/ai.ts

summarizeTrends(kpis: RevenueKPIs): Promise<Insight[]>

Use fixed system prompt:

“You are a revenue analyst for Whop creators. Output max 3 bullet insights in JSON with title/body/severity. Focus on churn spikes, failed payments, and trend deltas.”

If OPENAI_API_KEY missing — return safe fallback insights (“AI disabled”).

Seed & Fixtures

scripts/seed.ts writes demo rows into subscriptions, orders, refunds tables in Supabase (or skips if no DB).

scripts/fixtures/*.json must include:

subscriptions_30d.json

orders_90d.json

refunds_90d.json

Acceptance criteria (Cursor must satisfy)

npm run dev starts app with / and /dashboard loading without TS errors.

Hitting GET /api/whop/subscriptions with no env returns 401.

With fixtures enabled (dev flag), /dashboard renders demo charts and KPIs.

POST /api/insights with sample KPIs returns 1–3 insights.

Lighthouse: Performance > 90 on local; no blocking UI errors.

Unit tests for analytics.ts pass: npm run test.

Deployment

Vercel: configure WHOP_API_KEY, OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY.

Add vercel.json to mark /api/* as edge-runtime=false (Node runtime).

Post-deploy smoke test: open /dashboard and see demo data if no key.

Developer prompts for Cursor (use in order)

“Scaffold the project exactly per spec.md (folders, files, configs, scripts).”

“Implement Whop API wrappers with fixture fallback and create three JSON fixtures.”

“Implement analytics.ts pure functions + minimal Jest tests.”

“Build /dashboard UI with MetricCard, ChartCard, RetentionHeatmap, InsightBox, KPIGrid.”

“Wire API routes, env guards, loading/error states. Ensure cents-only math.”

“Add AI insights route with deterministic system prompt and safe fallback.”

“Create README with setup, env, and deploy steps.”