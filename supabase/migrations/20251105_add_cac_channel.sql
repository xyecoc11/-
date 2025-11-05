-- Add channel to orders
alter table if exists public.orders
  add column if not exists channel text
  check (channel in ('telegram','email','discord','twitter','instagram','unknown'))
  default 'unknown';

alter table if exists public.orders
  add column if not exists plan_id text;

-- Marketing costs table
create table if not exists public.marketing_costs (
  id text primary key,
  company_id text not null,
  period date not null,
  cost numeric not null,
  source text,
  created_at timestamptz default now()
);

create index if not exists idx_marketing_company_period on public.marketing_costs(company_id, period);

-- Views
create or replace view public.v_cohorts as
select
  company_id,
  to_char(date_trunc('month', started_at), 'YYYY-MM') as cohort,
  count(*) filter (where canceled_at is null) as active_now,
  count(*) filter (where canceled_at is not null) as churned
from public.subscriptions
group by company_id, date_trunc('month', started_at);

-- View for failure reasons (grouped by reason)
create or replace view public.v_failure_reasons as
select
  company_id,
  coalesce(reason,'unknown') as reason,
  count(*) as count,
  avg(case when status='recovered' then 100.0 else 0.0 end) as avg_recovery
from public.refunds
group by company_id, coalesce(reason,'unknown');

-- View for failure summary (aggregated metrics per company)
create or replace view public.v_failures as
with failed_orders as (
  select 
    company_id,
    count(*) as failed_count,
    sum(amount) as at_risk
  from public.orders
  where status = 'failed'
    and created_at > now() - interval '30 days'
  group by company_id
),
recovered_from_refunds as (
  select 
    r.company_id,
    count(distinct r.order_id) as recovered_count
  from public.refunds r
  where r.status = 'recovered'
    and r.created_at > now() - interval '30 days'
  group by r.company_id
),
recovered_from_succeeded_orders as (
  -- Orders that were failed and then succeeded (same id, updated_at > created_at)
  select 
    o.company_id,
    count(distinct o.id) as recovered_count
  from public.orders o
  where o.status = 'succeeded'
    and o.updated_at > o.created_at
    and o.created_at > now() - interval '30 days'
    and exists (
      -- Check if there was a previous failed status via webhook_events or refund
      select 1 from public.refunds r2
      where r2.order_id = o.id
        and r2.created_at < o.updated_at
    )
  group by o.company_id
),
combined_recovered as (
  select 
    coalesce(r1.company_id, r2.company_id) as company_id,
    (coalesce(r1.recovered_count, 0) + coalesce(r2.recovered_count, 0)) as recovered_count
  from recovered_from_refunds r1
  full outer join recovered_from_succeeded_orders r2 on r1.company_id = r2.company_id
)
select 
  coalesce(f.company_id, r.company_id) as company_id,
  coalesce(f.failed_count, 0)::bigint as failed_count,
  coalesce(f.at_risk, 0)::numeric as at_risk,
  coalesce(r.recovered_count, 0)::bigint as recovered_count,
  case 
    when coalesce(f.failed_count, 0) > 0 
    then (coalesce(r.recovered_count, 0)::float / f.failed_count::float * 100.0)
    else 0.0
  end as recovery_rate,
  2.5::numeric as avg_retry_time  -- placeholder, can be computed from webhook_events
from failed_orders f
full outer join combined_recovered r on f.company_id = r.company_id;


