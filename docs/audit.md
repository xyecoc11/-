## Multi-tenant and concurrency audit (Next.js + Supabase + Whop)

Summary of changes
- Enforced companyId scoping across API routes with Zod validation.
- Metrics endpoint now computes per-company with SQL filters.
- Data access helpers accept companyId and filter results.
- Webhook handler made idempotent (webhook_events PK = event_id) with status updates and redacted logging.
- Added sync locks table and locking in syncCompany to avoid concurrent syncs per tenant.
- Strengthened Supabase schema: RLS enabled; composite indexes on (company_id, created_at); optional analytics cache; companies table.

What you must configure
- Set SUPABASE_SERVICE_ROLE_KEY on server only (never client).
- Configure Whop webhooks to include company identifier; set WHOP_WEBHOOK_SECRET.
- Run supabase/multi_tenant.sql in SQL Editor.
- Optionally add Vercel cron to call /api/sync/company/<id> nightly.

Open items / next steps
- Replace sync placeholders with real Whop SDK pagination.
- Add rate limiting per company/user on write endpoints if required.
- Add unit tests for: double sync lock, duplicate webhook delivery, API without companyId -> 400, and static query scan for missing company_id filters.


