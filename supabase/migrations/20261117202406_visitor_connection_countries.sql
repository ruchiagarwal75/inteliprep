-- Additive private reporting. Existing hashes, counts and visit times are unchanged.
alter table interview_admin.app_ip_visitors
  add column if not exists raw_ip inet,
  add column if not exists country_code text check(country_code ~ '^[A-Z]{2}$');
create index if not exists app_ip_visitors_raw_expiry
  on interview_admin.app_ip_visitors(last_seen_at) where raw_ip is not null;
comment on column interview_admin.app_ip_visitors.raw_ip is
  'Private server-only address. Daily cleanup clears it after 30 days without a visit; never expose it in browser APIs or logs.';

-- Guest country reporting is separate from the existing registered-account count.
-- No raw address, IP hash or browsing trail is attached to this account record.
create table if not exists interview_admin.app_account_countries (
  environment text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_kind text not null check(account_kind in ('guest','account')),
  country_code text check(country_code ~ '^[A-Z]{2}$'),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  is_test boolean not null default false,
  primary key(environment,user_id),
  check(last_seen_at >= first_seen_at)
);
alter table interview_admin.app_account_countries enable row level security;
revoke all on interview_admin.app_account_countries from public,anon,authenticated;
grant select,insert,update on interview_admin.app_account_countries to mockmeai_reporting;
drop policy if exists reporting_service on interview_admin.app_account_countries;
create policy reporting_service on interview_admin.app_account_countries
  to mockmeai_reporting using (true) with check (true);
