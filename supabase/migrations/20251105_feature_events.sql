create table if not exists public.feature_events (
  id text primary key,
  company_id text not null,
  user_id text,
  feature text not null,
  timestamp timestamptz not null default now()
);

create index if not exists idx_feature_events_company_time on public.feature_events(company_id, timestamp);


