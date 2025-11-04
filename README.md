# Revenue Intelligence for Whop

A Next.js application that ingests Whop business data and renders a real-time revenue dashboard with MRR, ARR, churn, retention cohorts, failed payments, top customers, AI insights, and optional Discord daily digest.

## Prerequisites

- Node.js `>=18.18.0` (use `.nvmrc` with `nvm use`)
- npm or yarn

## Setup

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.local.example .env.local
   ```
   Then edit `.env.local` and add your keys:
   - `WHOP_API_KEY` - Required for `/api/whop/*` routes (from Whop App Credentials)
   - `NEXT_PUBLIC_WHOP_APP_ID` - Whop App ID (from Whop App Credentials)
   - `NEXT_PUBLIC_WHOP_AGENT_USER_ID` - Whop Agent User ID (from Whop App Credentials)
   - `NEXT_PUBLIC_WHOP_COMPANY_ID` - Whop Company ID (from Whop App Credentials)
   - `OPENROUTER_API_KEY` - Optional, for AI insights (uses DeepSeek R1 model)
   - `SUPABASE_URL` - Optional, for database backend
   - `SUPABASE_ANON_KEY` - Optional, for database backend
   - `DISCORD_WEBHOOK_URL` - Optional, for daily digest

3. **Seed database (optional):**
   ```bash
   npm run seed
   ```

## Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the landing page.

Visit [http://localhost:3000/dashboard](http://localhost:3000/dashboard) to see the revenue dashboard.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run Jest tests
- `npm run seed` - Seed Supabase database with demo data

## Project Structure

```
/src
  /app
    /api
      /whop          # Whop data endpoints (subscriptions, orders, refunds)
      /insights      # AI insights endpoint
      /digest        # Discord digest endpoint
    /dashboard       # Main dashboard page
  /components        # React components
  /lib
    analytics.ts     # Pure analytics functions (MRR, ARR, churn, cohorts)
    whop.ts          # Whop API fetchers with Supabase fallback
    ai.ts            # OpenAI insights generation
    db.ts            # Supabase client
    guard.ts         # API key validation
    types.ts         # TypeScript type definitions
  /scripts
    seed.ts          # Database seeding script
    /fixtures        # JSON fixture files
```

## API Routes

### Data Fetching
- `GET /api/whop/subscriptions?days=90` - Fetch subscriptions (requires WHOP_API_KEY)
- `GET /api/whop/orders?days=90` - Fetch orders (requires WHOP_API_KEY)
- `GET /api/whop/refunds?days=90` - Fetch refunds (requires WHOP_API_KEY)

### Analytics & Metrics
- `GET /api/metrics` - Get computed financial metrics (MRR, ARR, Churn, LTV, ARPU, NRR, etc.) from Supabase

### Data Sync & Automation
- `GET /api/sync/whop` - Sync data from Whop API to Supabase (requires WHOP_API_KEY)
- `POST /api/webhooks/whop` - Webhook endpoint for Whop events (payment_succeeded, subscription_created, etc.)
- `GET /api/test/sync` - End-to-end verification test (syncs data and validates metrics)

### AI & Notifications
- `POST /api/insights` - Generate AI insights from KPIs
- `POST /api/digest` - Send Discord daily digest

## Features

- **Real-time Revenue Metrics**: MRR, ARR, churn rate, failed payments, refund rate, LTV, ARPU, CAC, Payback Period, NRR
- **Automated Data Syncing**: Hourly sync from Whop API to Supabase (via cron)
- **Webhook Integration**: Real-time updates via Whop webhooks (payment events, subscription changes)
- **Retention Cohorts**: 6x6 heatmap showing user retention over time
- **Top Customers**: Ranked by Lifetime Value (LTV)
- **AI Insights**: OpenRouter-powered revenue analysis using DeepSeek R1 (optional)
- **Discord Integration**: Daily digest webhook (optional)
- **Supabase Integration**: Production-ready database backend with automatic data processing

## Setup Instructions

### 1. Database Setup

Run the SQL schema in your Supabase SQL editor:
```bash
# Copy the contents of supabase/schema.sql and execute in Supabase SQL Editor
```

This creates all required tables: `users`, `subscriptions`, `orders`, `refunds`, `events`, `webhook_logs`, `sync_status`.

### 2. Initial Data Sync

After setting up environment variables, trigger an initial sync:
```bash
curl http://localhost:3000/api/sync/whop
```

Or use the test endpoint for full verification:
```bash
curl http://localhost:3000/api/test/sync
```

### 3. Configure Webhooks (Optional)

In your Whop dashboard, configure webhooks to point to:
```
https://your-domain.com/api/webhooks/whop
```

Set the `WHOP_WEBHOOK_SECRET` environment variable for signature validation.

### 4. Cron Job (Vercel)

The sync is automatically scheduled to run hourly via Vercel cron (see `vercel.json`).

## Deployment

### Vercel

1. Push to GitHub/GitLab
2. Import project in Vercel
3. Add environment variables:
   - `WHOP_API_KEY` - Required for syncing and fetching Whop data (from Whop App Credentials)
   - `NEXT_PUBLIC_WHOP_APP_ID` - Whop App ID (from Whop App Credentials)
   - `NEXT_PUBLIC_WHOP_AGENT_USER_ID` - Whop Agent User ID (from Whop App Credentials)
   - `NEXT_PUBLIC_WHOP_COMPANY_ID` - Whop Company ID (from Whop App Credentials)
   - `SUPABASE_URL` - Required for database backend
   - `SUPABASE_ANON_KEY` - Required for database access
   - `SUPABASE_SERVICE_ROLE_KEY` - Required for server-side writes (webhooks, sync)
   - `SYNC_TOKEN` - Required for GitHub Actions hourly sync (generate a strong random string)
   - `WHOP_WEBHOOK_SECRET` - Optional, for webhook signature validation
   - `CAC` - Optional, Customer Acquisition Cost (for payback period calculation)
   - `OPENROUTER_API_KEY` (optional, for AI insights)
   - `DISCORD_WEBHOOK_URL` (optional, for daily digest)
4. Deploy

### Whop Hosting Setup

1. In your Whop App Dashboard → Hosting, set:
   - Dashboard View: `/dashboard/[companyId]`
   - Base URL: your deployed URL (e.g., `https://your-app.vercel.app`)
2. During local development, enable Localhost mode via the dev overlay.
3. Ensure Next.js config is wrapped with Whop settings (already applied using `withWhopAppConfig`).
4. After deploying, switch the app frame to Production mode.

### Health Check

- Verify required environment variables are set:
  - Open: `/api/health`
  - Expect: `{ ok: true, env: { WHOP_API_KEY: true, NEXT_PUBLIC_WHOP_APP_ID: true, ... } }`
- If `ok: false`, set missing vars in your hosting provider.

The `vercel.json` config ensures API routes run on Node.js runtime.

## License

MIT
