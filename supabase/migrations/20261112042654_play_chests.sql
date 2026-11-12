-- A chest and its XP ledger entry are written in one player transaction.
create table if not exists practice_game.chest_opens (
 user_id uuid not null references auth.users(id) on delete cascade,
 topic text not null, after_level integer not null check(after_level between 1 and 100),
 xp integer not null check(xp between 20 and 50), opened_at timestamptz not null default now(),
 primary key(user_id,topic,after_level)
);
alter table practice_game.chest_opens enable row level security;
revoke all on practice_game.chest_opens from public, anon, authenticated;
grant select,insert,update on practice_game.chest_opens to mockmeai_reporting;
grant select on practice_game.chest_opens to authenticated;
do $$ begin if not exists(select 1 from pg_policies where schemaname='practice_game' and tablename='chest_opens' and policyname='server_owner') then
create policy server_owner on practice_game.chest_opens to mockmeai_reporting
 using (user_id=nullif(current_setting('mockmeai.user_id',true),'')::uuid)
 with check (user_id=nullif(current_setting('mockmeai.user_id',true),'')::uuid);
end if; if not exists(select 1 from pg_policies where schemaname='practice_game' and tablename='chest_opens' and policyname='own_account') then
create policy own_account on practice_game.chest_opens for select to authenticated
 using (user_id=(select auth.uid()));
end if; end $$;
