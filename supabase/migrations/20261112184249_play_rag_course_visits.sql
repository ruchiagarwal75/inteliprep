-- Additive course visits. Retired attempts, progress, rewards and policies stay intact.
create table if not exists practice_game.course_visits (
 user_id uuid not null references auth.users(id) on delete cascade,
 course_id text not null check(course_id='rag-course'),
 level integer not null check(level between 1 and 9),
 seen_through integer not null check(seen_through between 0 and 5),
 completed_at timestamptz,
 primary key(user_id,course_id,level)
);
alter table practice_game.course_visits enable row level security;
revoke all on practice_game.course_visits from public,anon,authenticated;
grant select on practice_game.course_visits to authenticated;
grant select,insert,update on practice_game.course_visits to mockmeai_reporting;
do $$ begin
 if not exists(select 1 from pg_policies where schemaname='practice_game' and tablename='course_visits' and policyname='server_owner') then
  create policy server_owner on practice_game.course_visits to mockmeai_reporting
   using (user_id=nullif(current_setting('mockmeai.user_id',true),'')::uuid)
   with check (user_id=nullif(current_setting('mockmeai.user_id',true),'')::uuid);
 end if;
 if not exists(select 1 from pg_policies where schemaname='practice_game' and tablename='course_visits' and policyname='own_account') then
  create policy own_account on practice_game.course_visits for select to authenticated using(user_id=(select auth.uid()));
 end if;
end $$;
