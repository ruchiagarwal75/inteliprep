begin;
-- Additive onboarding state. Existing course progress and profiles are untouched.
create table if not exists practice_game.welcome_state (
 user_id uuid primary key references auth.users(id) on delete cascade,
 welcome_seen_at timestamptz
);
create table if not exists practice_game.welcome_runs (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('auto','replay')),
 created_at timestamptz not null default now(), finished_at timestamptz,
 outcome text check(outcome in ('skipped','completed')),
 panel integer check(panel between 1 and 4), topic_started_at timestamptz,
 check((finished_at is null and outcome is null and panel is null) or
       (finished_at is not null and outcome is not null and panel is not null)),
 check(outcome is distinct from 'completed' or panel=4),
 check(topic_started_at is null or outcome='completed')
);
create unique index if not exists welcome_auto_once on practice_game.welcome_runs(user_id) where kind='auto';
create index if not exists welcome_runs_owner on practice_game.welcome_runs(user_id,created_at desc);
do $$ declare name text; begin
 foreach name in array array['welcome_state','welcome_runs'] loop
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
commit;
