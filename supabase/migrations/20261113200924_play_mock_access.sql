begin;

-- Additive entitlements. Existing interviews, progress and rewards stay intact.
create table if not exists practice_game.mock_access (
 user_id uuid primary key references auth.users(id) on delete cascade,
 plan text not null default 'free' check(plan in ('free','pro')),
 free_boss_used_at timestamptz,
 free_boss_session_id uuid,
 pro_interest_at timestamptz,
 world_cleared_seen_at timestamptz,
 updated_at timestamptz not null default now(),
 check((free_boss_used_at is null)=(free_boss_session_id is null))
);
create table if not exists practice_game.boss_attempts (
 session_id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null,
 access_plan text not null check(access_plan in ('free','pro')),
 started_at timestamptz not null,
 deadline_at timestamptz not null,
 ended_at timestamptz,
 graded_at timestamptz,
 score numeric check(score between 0 and 1),
 signal text check(signal in ('strong_no','no','yes','strong_yes','insufficient_evidence')),
 passed boolean not null default false,
 refunded_at timestamptz,
 refund_category text,
 unique(user_id,request_id),
 check(deadline_at>started_at),
 check(not passed or (graded_at is not null and ended_at is not null and signal in ('yes','strong_yes'))),
 check((refunded_at is null)=(refund_category is null))
);
create index if not exists boss_attempts_owner_recent on practice_game.boss_attempts(user_id,started_at desc,session_id);
create table if not exists practice_game.mock_access_changes (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,
 action text not null check(action in ('plan_changed','free_attempt_reset','free_attempt_returned')),
 old_plan text check(old_plan in ('free','pro')),
 new_plan text check(new_plan in ('free','pro')),
 session_id uuid,
 category text,
 created_at timestamptz not null default now()
);
create index if not exists mock_access_changes_owner_recent on practice_game.mock_access_changes(user_id,created_at desc);

do $$ declare name text; begin
 foreach name in array array['mock_access','boss_attempts','mock_access_changes'] loop
  execute format('alter table practice_game.%I enable row level security',name);
  execute format('revoke all on practice_game.%I from public,anon,authenticated',name);
  execute format('grant select on practice_game.%I to authenticated',name);
  execute format('grant select,insert,update on practice_game.%I to mockmeai_reporting',name);
  if not exists(select 1 from pg_policies where schemaname='practice_game' and tablename=name and policyname='server_owner') then
   execute format('create policy server_owner on practice_game.%I to mockmeai_reporting using (user_id=nullif(current_setting(''mockmeai.user_id'',true),'''')::uuid) with check (user_id=nullif(current_setting(''mockmeai.user_id'',true),'''')::uuid)',name);
  end if;
  if not exists(select 1 from pg_policies where schemaname='practice_game' and tablename=name and policyname='own_account') then
   execute format('create policy own_account on practice_game.%I for select to authenticated using(user_id=(select auth.uid()))',name);
  end if;
 end loop;
end $$;
-- Audit entries are append-only for the runtime role.
revoke update on practice_game.mock_access_changes from mockmeai_reporting;

commit;
