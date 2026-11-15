begin;
create schema if not exists interview_admin;
grant usage on schema interview_admin to mockmeai_reporting;

create table if not exists interview_admin.mock_beta_requests (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  problem_id text not null,
  environment text not null,
  is_test boolean not null default false,
  first_viewed_at timestamptz not null default now(),
  last_viewed_at timestamptz not null default now(),
  requested_at timestamptz,
  status text not null default 'viewed' check (status in ('viewed','requested','approved','revoked')),
  version integer not null default 0 check (version >= 0),
  unique (environment,user_id,problem_id),
  check (status='viewed' or requested_at is not null)
);
create index if not exists mock_beta_requests_queue on interview_admin.mock_beta_requests(environment,requested_at desc) where requested_at is not null;
create index if not exists mock_beta_requests_user on interview_admin.mock_beta_requests(user_id);

create table if not exists interview_admin.mock_beta_grants (
  id uuid primary key,
  request_id uuid not null references interview_admin.mock_beta_requests(id) on delete cascade,
  approved_at timestamptz not null default now(),
  approved_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  consumed_session_id uuid unique,
  consumed_request_id uuid,
  started_at timestamptz,
  deadline_at timestamptz,
  check ((consumed_session_id is null and consumed_request_id is null and started_at is null and deadline_at is null)
    or (consumed_session_id is not null and consumed_request_id is not null and started_at is not null and deadline_at is not null and deadline_at >= started_at))
);
create unique index if not exists mock_beta_grants_available on interview_admin.mock_beta_grants(request_id) where consumed_session_id is null and revoked_at is null;
create index if not exists mock_beta_grants_request on interview_admin.mock_beta_grants(request_id);
create index if not exists mock_beta_grants_replay on interview_admin.mock_beta_grants(consumed_request_id) where consumed_request_id is not null;

alter table interview_admin.mock_beta_requests enable row level security;
alter table interview_admin.mock_beta_grants enable row level security;
revoke all on interview_admin.mock_beta_requests,interview_admin.mock_beta_grants from public,anon,authenticated;
grant select,insert,update on interview_admin.mock_beta_requests,interview_admin.mock_beta_grants to mockmeai_reporting;
drop policy if exists reporting_service on interview_admin.mock_beta_requests;
create policy reporting_service on interview_admin.mock_beta_requests to mockmeai_reporting using (true) with check (true);
drop policy if exists reporting_service on interview_admin.mock_beta_grants;
create policy reporting_service on interview_admin.mock_beta_grants to mockmeai_reporting using (true) with check (true);
commit;
