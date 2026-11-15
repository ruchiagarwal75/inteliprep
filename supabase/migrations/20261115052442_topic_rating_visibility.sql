begin;

-- A response is not proof that an earlier version recorded the popup display.
-- Existing responses and unknown historical dismissal reasons stay unchanged.
alter table interview_admin.topic_ratings
  add column if not exists dismissal_reason text
  check (dismissal_reason is null or (skipped and dismissal_reason in ('skip','close')));

create table if not exists interview_admin.topic_rating_views (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  topic text not null,
  level integer not null check (level between 0 and 100),
  environment text not null,
  is_test boolean not null default false,
  shown_at timestamptz not null default now(),
  unique (environment,user_id)
);
create index if not exists topic_rating_views_recent
  on interview_admin.topic_rating_views(environment,shown_at desc,id);
alter table interview_admin.topic_rating_views enable row level security;
revoke all on interview_admin.topic_rating_views from public,anon,authenticated,mockmeai_reporting;
grant select,insert on interview_admin.topic_rating_views to mockmeai_reporting;
drop policy if exists reporting_service on interview_admin.topic_rating_views;
create policy reporting_service on interview_admin.topic_rating_views
  to mockmeai_reporting using (true) with check (true);

commit;
