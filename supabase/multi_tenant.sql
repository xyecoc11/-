-- Multi-tenant schema and RLS for Supabase

-- Companies
create table if not exists public.companies (
  id text primary key,
  name text,
  install_status text default 'installed',
  last_synced_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ensure company_id column exists on core tables
alter table if exists public.subscriptions add column if not exists company_id text;
alter table if exists public.orders add column if not exists company_id text;
alter table if exists public.refunds add column if not exists company_id text;
alter table if exists public.events add column if not exists company_id text;

-- Webhook events log
create table if not exists public.webhook_events (
  id text primary key, -- event_id from Whop
  type text not null,
  company_id text,
  payload jsonb,
  received_at timestamptz default now(),
  processed_at timestamptz,
  status text default 'processed'
);

-- Analytics cache
create table if not exists public.analytics_cache (
  company_id text not null,
  period_key text not null,
  payload_json jsonb not null,
  refreshed_at timestamptz default now(),
  primary key (company_id, period_key)
);

-- Indexes
create index if not exists idx_subscriptions_company on public.subscriptions(company_id);
create index if not exists idx_subscriptions_company_created on public.subscriptions(company_id, started_at);
create index if not exists idx_orders_company on public.orders(company_id);
create index if not exists idx_orders_company_created on public.orders(company_id, created_at);
create index if not exists idx_refunds_company on public.refunds(company_id);
create index if not exists idx_refunds_company_created on public.refunds(company_id, created_at);
create index if not exists idx_events_company on public.events(company_id);

-- RLS enable
alter table public.companies enable row level security;
alter table public.subscriptions enable row level security;
alter table public.orders enable row level security;
alter table public.refunds enable row level security;
alter table public.webhook_events enable row level security;
alter table public.analytics_cache enable row level security;

-- Optional: sync lock table to prevent concurrent sync per company
create table if not exists public.sync_locks (
  company_id text primary key,
  locked_at timestamptz default now()
);
alter table public.sync_locks enable row level security;

-- Policies: service role full access
do $$ begin
  create policy if not exists companies_service_all on public.companies for all using (true) with check (true);
exception when others then null; end $$;

-- Policies: company-scoped read (expects JWT claim company_id)
do $$ begin
  create policy if not exists subs_select_company on public.subscriptions for select using (company_id = current_setting('request.jwt.claims', true)::jsonb->>'company_id');
exception when others then null; end $$;

do $$ begin
  create policy if not exists orders_select_company on public.orders for select using (company_id = current_setting('request.jwt.claims', true)::jsonb->>'company_id');
exception when others then null; end $$;

do $$ begin
  create policy if not exists refunds_select_company on public.refunds for select using (company_id = current_setting('request.jwt.claims', true)::jsonb->>'company_id');
exception when others then null; end $$;

do $$ begin
  create policy if not exists analytics_select_company on public.analytics_cache for select using (company_id = current_setting('request.jwt.claims', true)::jsonb->>'company_id');
exception when others then null; end $$;


