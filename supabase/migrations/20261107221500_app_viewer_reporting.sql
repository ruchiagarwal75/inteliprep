-- Additive first-visit reporting. Existing interviews and browser history are unchanged.
alter table interview_admin.reporting_state
  add column if not exists viewer_tracking_started_at timestamptz;
update interview_admin.reporting_state set viewer_tracking_started_at=now()
  where viewer_tracking_started_at is null;

create table if not exists interview_admin.app_viewers (
  environment text not null,
  visitor_hash text not null check (visitor_hash ~ '^[0-9a-f]{64}$'),
  user_id uuid references auth.users(id) on delete set null,
  is_test boolean not null default false,
  first_seen_at timestamptz not null default now(),
  primary key (environment,visitor_hash)
);
create index if not exists app_viewers_first_seen
  on interview_admin.app_viewers(environment,first_seen_at desc);
alter table interview_admin.app_viewers enable row level security;
revoke all on table interview_admin.app_viewers from public,anon,authenticated;
