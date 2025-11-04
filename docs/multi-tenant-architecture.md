## Multi-tenant data architecture for Whop dashboard

### Data source model
- Primary source: Whop webhooks for near real-time updates (payments, subscriptions, refunds, memberships).
- Secondary (backfill/repair): scheduled sync per company via cron or manual trigger.
- Local cache: Supabase holds normalized tables per company using `company_id` for partitioning. Analytics queries read from Supabase only.

### Tables (core)
- `companies` (id, name, created_at, updated_at, install_status, last_synced_at)
- `subscriptions` (id, user_id, company_id, plan_id, status, amount, interval, started_at, current_period_end, canceled_at, created_at, updated_at)
- `orders` (id, user_id, company_id, amount, currency, status, created_at, updated_at)
- `refunds` (id, order_id, user_id, company_id, amount, reason, created_at)
- `webhook_events` (id, type, company_id, payload, received_at, processed_at, status)
- optional: `analytics_cache` (company_id, period_key, payload_json, refreshed_at)

All have `company_id` and timestamps. Whop IDs are used as PKs when possible.

### RLS (row-level security)
- Enable RLS on all company-scoped tables.
- Policy: allow read/write only when `auth.jwt()` contains `company_id` that matches row `company_id`, or for service role.
- For backend server actions, use `supabaseAdmin` with service role key; for client reads (if any), issue JWTs with `company_id` claim.

### Sync strategy
1) Webhooks (push): upsert orders, subscriptions, refunds by `id` and `company_id`; log event idempotently.
2) Scheduled sync (pull): `GET /api/sync/company/[companyId]` fetches last N days and reconciles missing rows.
3) Analytics cache: materialize KPIs per company periodically; invalidate on webhook.

### Minimizing API load
- Read analytics from Supabase.
- Use webhooks as primary driver; fall back to daily/hourly backfill.
- Cache aggregates in `analytics_cache` with short TTL.

### Access control in app
- Server route `/dashboard/[companyId]` verifies token only when embedded in Whop; otherwise renders for dev.
- All API routes accept `companyId` and scope queries accordingly.

### Implementation notes
- Upsert helpers must always include `company_id` in unique composite constraints.
- Store raw webhook payload and `event_id` for idempotency.
- On company install, create `companies` row and trigger initial sync.


