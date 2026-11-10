-- Account visits are distinct from unverified browser IDs. Preserve all old records.
create table if not exists interview_admin.app_visitor_accounts (
  environment text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  is_test boolean not null default false,
  primary key (environment, user_id)
);
alter table interview_admin.app_visitor_accounts enable row level security;
revoke all on interview_admin.app_visitor_accounts from public, anon, authenticated;
grant select, insert, update on interview_admin.app_visitor_accounts to mockmeai_reporting;
drop policy if exists reporting_service on interview_admin.app_visitor_accounts;
create policy reporting_service on interview_admin.app_visitor_accounts
  to mockmeai_reporting using (true) with check (true);

-- Only existing verified account links can be imported. Never infer anonymous people.
insert into interview_admin.app_visitor_accounts (environment,user_id,first_seen_at,is_test)
select environment,user_id,min(first_seen_at),bool_or(is_test)
from interview_admin.app_viewers where user_id is not null
group by environment,user_id on conflict (environment,user_id) do nothing;
