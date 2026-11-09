-- Comparison only: no raw IPs, user IDs, headers or browsing trails are stored.
create table if not exists interview_admin.app_ip_visitors (
  environment text not null,
  ip_hash text not null check (ip_hash ~ '^[a-f0-9]{64}$'),
  is_test boolean not null default false,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (environment,ip_hash,is_test),
  check (last_seen_at >= first_seen_at)
);
create index if not exists app_ip_visitors_recent
  on interview_admin.app_ip_visitors(environment,last_seen_at desc);
alter table interview_admin.app_ip_visitors enable row level security;
revoke all on interview_admin.app_ip_visitors from public,anon,authenticated;
grant select,insert,update on interview_admin.app_ip_visitors to mockmeai_reporting;
drop policy if exists reporting_service on interview_admin.app_ip_visitors;
create policy reporting_service on interview_admin.app_ip_visitors
  to mockmeai_reporting using (true) with check (true);
