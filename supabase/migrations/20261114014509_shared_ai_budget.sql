-- Authoritative shared budget. No transcript, drawing or credentials.
create table if not exists interview_admin.ai_budget_days (
  day date primary key,
  spent_usd numeric(14,6) not null default 0 check(spent_usd>=0),
  uncertain_usd numeric(14,6) not null default 0 check(uncertain_usd>=0),
  created_at timestamptz not null default now()
);
create table if not exists interview_admin.ai_budget_reservations (
  id uuid primary key,
  day date not null references interview_admin.ai_budget_days(day),
  kind text not null check(kind in ('mock','call')),
  user_id uuid references auth.users(id) on delete set null,
  request_id uuid,
  interview_id uuid,
  parent_id uuid references interview_admin.ai_budget_reservations(id),
  held_usd numeric(14,6) not null check(held_usd>=0),
  protected_usd numeric(14,6) not null default 0 check(protected_usd>=0),
  settled boolean not null default false,
  unknown_usage boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  unique(user_id,request_id)
);
create index if not exists ai_budget_interview on interview_admin.ai_budget_reservations(interview_id) where kind='mock';
alter table interview_admin.ai_budget_days enable row level security;
alter table interview_admin.ai_budget_reservations enable row level security;
revoke all on interview_admin.ai_budget_days,interview_admin.ai_budget_reservations from public,anon,authenticated;
grant select,insert,update on interview_admin.ai_budget_days,interview_admin.ai_budget_reservations to mockmeai_reporting;
drop policy if exists reporting_service on interview_admin.ai_budget_days;
create policy reporting_service on interview_admin.ai_budget_days to mockmeai_reporting using(true) with check(true);
drop policy if exists reporting_service on interview_admin.ai_budget_reservations;
create policy reporting_service on interview_admin.ai_budget_reservations to mockmeai_reporting using(true) with check(true);
