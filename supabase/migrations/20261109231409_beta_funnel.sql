-- Only the three milestones absent from existing reporting records.
alter table interview_admin.reporting_state add column if not exists beta_funnel_since timestamptz not null default now();
create table if not exists interview_admin.beta_funnel_events (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  interview_id uuid references interview_admin.interviews(id),
  environment text not null,
  is_test boolean not null default false,
  event text not null check(event in ('signed_in','score_threshold_passed','scorecard_opened')),
  subject_key text not null,
  occurred_at timestamptz not null default now(),
  unique(environment,user_id,event,subject_key)
);
create index if not exists beta_funnel_event_time on interview_admin.beta_funnel_events(environment,occurred_at,user_id);
alter table interview_admin.beta_funnel_events enable row level security;
revoke all on interview_admin.beta_funnel_events from public,anon,authenticated;
grant select,insert,update on interview_admin.beta_funnel_events to mockmeai_reporting;
drop policy if exists reporting_service on interview_admin.beta_funnel_events;
create policy reporting_service on interview_admin.beta_funnel_events to mockmeai_reporting using(true) with check(true);
