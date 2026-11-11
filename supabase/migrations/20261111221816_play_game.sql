-- Play is private. Existing interview tables, policies and saved sessions are unchanged.
create schema if not exists practice_game;
revoke all on schema practice_game from public, anon;
grant usage on schema practice_game to authenticated, mockmeai_reporting;
create table if not exists practice_game.player_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 chosen_level text not null default 'senior' check (chosen_level in ('mid','senior','staff')),
 time_zone text not null default 'UTC' check (length(time_zone) between 1 and 100),
 zone_set boolean not null default false,
 math_run integer not null default 0 check (math_run>=0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists practice_game.play_sessions (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null, topic text not null, level integer, active_ordinal integer not null default 0 check(active_ordinal>=0),
 mode text not null check(mode in ('level','placement','review')),
 created_at timestamptz not null default now(), completed_at timestamptz,
 result_json jsonb, unique(user_id, request_id),
 check((mode='level' and level between 1 and 100) or (mode<>'level' and level is null))
);
create table if not exists practice_game.drill_attempts (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid not null references practice_game.play_sessions(id),
 drill_id text not null, topic text not null, level integer not null check(level between 1 and 100),
 type text not null check(type in ('math','spot_flaw','pick_probe','tradeoff')),
 ordinal integer not null check(ordinal>=0), private_variant jsonb not null,
 answer jsonb, correct boolean, score numeric check(score between 0 and 1),
 points_awarded integer not null default 0 check(points_awarded>=0),
 time_ms bigint check(time_ms>=0), created_at timestamptz not null default now(),
 started_at timestamptz, submitted_at timestamptz, claim_id uuid, claim_until timestamptz, result_json jsonb,
 unique(session_id,ordinal), unique(session_id,drill_id),
 check((submitted_at is null and correct is null and score is null) or
       (submitted_at is not null and correct is not null and score is not null and answer is not null and result_json is not null))
);
create table if not exists practice_game.level_progress (
 user_id uuid not null references auth.users(id) on delete cascade,
 topic text not null, level integer not null check(level between 1 and 100),
 status text not null check(status in ('locked','open','passed')),
 best_score numeric not null default 0 check(best_score between 0 and 1), passed_at timestamptz,
 primary key(user_id,topic,level), check((status='passed')=(passed_at is not null))
);
create table if not exists practice_game.topic_readiness (
 user_id uuid not null references auth.users(id) on delete cascade,
 topic text not null, state text not null default 'not_tested'
 check(state in ('not_tested','gap','practice_ready','interview_ready')),
 verified_level text check(verified_level in ('mid','senior','staff')),
 updated_at timestamptz not null default now(), last_activity_at timestamptz,
 ready_at timestamptz, prompt_seen_at timestamptz,
 primary key(user_id,topic),
 check(state<>'interview_ready' or (verified_level is not null and last_activity_at is not null))
);
create table if not exists practice_game.streaks (
 user_id uuid primary key references auth.users(id) on delete cascade,
 current integer not null default 0 check(current>=0), longest integer not null default 0 check(longest>=current),
 freezes_available integer not null default 0 check(freezes_available between 0 and 2),
 last_active_date date, last_resolved_date date
);
create table if not exists practice_game.points_ledger (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 delta integer not null, reason text not null, ref_id text not null,
 created_at timestamptz not null default now(), unique(user_id,reason,ref_id)
);
create table if not exists practice_game.review_queue (
 user_id uuid not null references auth.users(id) on delete cascade,
 drill_id text not null, topic text not null, level integer not null check(level between 1 and 100),
 due_at timestamptz not null, step integer not null check(step in (2,5,12)),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key(user_id,drill_id)
);
create table if not exists practice_game.badges (
 user_id uuid not null references auth.users(id) on delete cascade,
 badge_id text not null, earned_at timestamptz not null default now(), primary key(user_id,badge_id)
);
create table if not exists practice_game.play_events (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 event text not null check(event in ('drill_started','drill_submitted','level_passed','placement_done','streak_extended','freeze_used','badge_earned','readiness_changed','mock_prompt_shown','mock_started_from_prompt')),
 ref_id text not null, topic text, drill_type text, correct boolean, time_ms bigint,
 created_at timestamptz not null default now(), unique(user_id,event,ref_id)
);
create table if not exists practice_game.daily_ai_usage (
 user_id uuid not null references auth.users(id) on delete cascade,
 day date not null, calls integer not null default 0 check(calls>=0), primary key(user_id,day)
);
create index if not exists play_sessions_owner_recent on practice_game.play_sessions(user_id,created_at desc);
create index if not exists play_attempts_owner_recent on practice_game.drill_attempts(user_id,created_at desc);
create index if not exists play_reviews_due on practice_game.review_queue(user_id,topic,due_at);
create index if not exists play_ledger_owner_recent on practice_game.points_ledger(user_id,created_at desc);
create index if not exists play_events_recent on practice_game.play_events(created_at,event);
-- Browser accounts can read their own public outcomes. They cannot edit grades or rewards.
-- Server writes use a transaction-local verified owner, not a request-body user ID.
do $$ declare entry record; begin
 for entry in select tablename from pg_tables where schemaname='practice_game' loop
  execute format('alter table practice_game.%I enable row level security',entry.tablename);
  execute format('revoke all on practice_game.%I from public,anon,authenticated',entry.tablename);
  execute format('grant select,insert,update on practice_game.%I to mockmeai_reporting',entry.tablename);
  execute format('drop policy if exists server_owner on practice_game.%I',entry.tablename);
  execute format('create policy server_owner on practice_game.%I to mockmeai_reporting using (user_id=nullif(current_setting(''mockmeai.user_id'',true),'''')::uuid) with check (user_id=nullif(current_setting(''mockmeai.user_id'',true),'''')::uuid)',entry.tablename);
  execute format('drop policy if exists own_account on practice_game.%I',entry.tablename);
  execute format('create policy own_account on practice_game.%I to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()))',entry.tablename);
  if entry.tablename<>'drill_attempts' then
   execute format('grant select on practice_game.%I to authenticated',entry.tablename);
  end if;
 end loop;
end $$;
grant select (id,user_id,session_id,drill_id,topic,level,type,ordinal,answer,correct,score,points_awarded,time_ms,created_at,started_at,submitted_at,result_json) on practice_game.drill_attempts to authenticated;
grant delete on practice_game.review_queue to mockmeai_reporting;
comment on schema practice_game is 'Server-owned practice game. Do not expose this schema or grant browser writes to outcomes.';
