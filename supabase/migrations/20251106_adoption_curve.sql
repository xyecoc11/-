-- View for adoption curve: cumulative adoption percentage by day
create or replace view public.v_adoption_curve as
with last_30_days as (
  select generate_series(
    date_trunc('day', now() - interval '30 days'),
    date_trunc('day', now()),
    interval '1 day'
  )::date as day
),
user_first_feature as (
  select 
    company_id,
    user_id,
    min(date_trunc('day', timestamp))::date as first_feature_day
  from public.feature_events
  group by company_id, user_id
),
total_users_by_company as (
  select 
    company_id,
    count(distinct user_id) as total
  from public.feature_events
  group by company_id
),
daily_adoption as (
  select 
    d.day,
    ufc.company_id,
    count(distinct ufc.user_id) as adopted_users
  from last_30_days d
  cross join (select distinct company_id from public.feature_events) companies
  left join user_first_feature ufc on 
    ufc.company_id = companies.company_id
    and ufc.first_feature_day <= d.day
  group by d.day, ufc.company_id
)
select 
  da.day,
  da.company_id,
  coalesce(da.adopted_users, 0)::bigint as adopted_users,
  tu.total::bigint as total_users,
  case 
    when tu.total > 0 
    then (coalesce(da.adopted_users, 0)::float / tu.total::float * 100.0)
    else 0.0
  end as adoption_pct
from daily_adoption da
left join total_users_by_company tu on da.company_id = tu.company_id
where da.company_id is not null;

