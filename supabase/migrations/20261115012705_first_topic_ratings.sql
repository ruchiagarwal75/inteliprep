begin;

-- Quiz ownership/completion is verified by the server under the player's RLS scope.
-- Keep this reporting migration independent of the Play installation order.
create table if not exists interview_admin.topic_ratings (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  topic text not null,
  level integer not null check (level between 0 and 100),
  environment text not null,
  is_test boolean not null default false,
  stars smallint check (stars between 1 and 5),
  skipped boolean not null,
  created_at timestamptz not null default now(),
  unique (environment,user_id),
  check ((skipped and stars is null) or (not skipped and stars is not null))
);
create index if not exists topic_ratings_recent
  on interview_admin.topic_ratings(environment,created_at desc,id);
alter table interview_admin.topic_ratings enable row level security;
revoke all on interview_admin.topic_ratings from public,anon,authenticated,mockmeai_reporting;
grant select,insert on interview_admin.topic_ratings to mockmeai_reporting;
drop policy if exists reporting_service on interview_admin.topic_ratings;
create policy reporting_service on interview_admin.topic_ratings
  to mockmeai_reporting using (true) with check (true);

commit;
