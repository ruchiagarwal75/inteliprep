create table if not exists interview_admin.feedback (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  interview_id uuid null references interview_admin.interviews(id),
  environment text not null,
  is_test boolean not null default false,
  source text not null check (source in ('interview_end','menu')),
  liked text check (liked in ('loved','okay','not_for_me')),
  would_return text check (would_return in ('yes','maybe','no')),
  skipped boolean not null,
  comment text check (char_length(comment)<=2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id,interview_id),
  check ((source='interview_end' and interview_id is not null) or (source='menu' and interview_id is null)),
  check (skipped or liked is not null or would_return is not null or coalesce(length(btrim(comment)),0)>0)
);
create index if not exists feedback_recent on interview_admin.feedback(environment,created_at desc,id);
alter table interview_admin.feedback enable row level security;
revoke all on interview_admin.feedback from public,anon,authenticated;
grant select,insert,update on interview_admin.feedback to mockmeai_reporting;
drop policy if exists reporting_service on interview_admin.feedback;
create policy reporting_service on interview_admin.feedback
  to mockmeai_reporting using (true) with check (true);
