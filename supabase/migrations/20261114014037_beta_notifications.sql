-- Private transactional notifications. Never expose recipients or bodies to candidates.
create table if not exists interview_admin.notifications (
  id uuid primary key,
  environment text not null,
  event_key text not null,
  kind text not null check(kind in ('welcome','new_user','spend_warning','spend_cap')),
  recipient text not null,
  sender text not null,
  subject text not null,
  body text not null,
  status text not null default 'pending' check(status in ('pending','sending','sent','failed')),
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  first_attempt_at timestamptz,
  claimed_at timestamptz,
  sent_at timestamptz,
  reference_id uuid,
  provider_id text,
  failure_category text,
  unique(environment,event_key)
);
create index if not exists notifications_pending on interview_admin.notifications(environment,status,created_at);
alter table interview_admin.notifications enable row level security;
revoke all on interview_admin.notifications from public,anon,authenticated;
grant select,insert,update on interview_admin.notifications to mockmeai_reporting;
drop policy if exists reporting_service on interview_admin.notifications;
create policy reporting_service on interview_admin.notifications to mockmeai_reporting using(true) with check(true);

create table if not exists interview_admin.account_onboarding (
  user_id uuid not null references auth.users(id) on delete cascade,
  environment text not null,
  first_access_at timestamptz not null default now(),
  primary key(user_id,environment)
);
alter table interview_admin.account_onboarding enable row level security;
revoke all on interview_admin.account_onboarding from public,anon,authenticated;
grant select,insert,update on interview_admin.account_onboarding to mockmeai_reporting;
drop policy if exists reporting_service on interview_admin.account_onboarding;
create policy reporting_service on interview_admin.account_onboarding to mockmeai_reporting using(true) with check(true);

-- One-time baseline only, so installing or re-running the migration cannot send
-- welcome messages to established approved accounts or suppress future signups.
alter table interview_admin.reporting_state add column if not exists onboarding_baselined_at timestamptz;
do $$ begin
  if exists(select 1 from interview_admin.reporting_state where onboarding_baselined_at is null) then
    insert into interview_admin.account_onboarding(user_id,environment)
      select u.id,'production' from interview_admin.registered_users u
      join interview_admin.beta_invites i on i.email=lower(btrim(u.email)) and i.approved
      on conflict do nothing;
    update interview_admin.reporting_state set onboarding_baselined_at=now();
  end if;
end $$;
