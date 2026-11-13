begin;
-- New event dimensions are nullable for historical rows, whose environment is unknown.
alter table practice_game.play_events add column if not exists environment text;
alter table practice_game.play_events add column if not exists is_test boolean;
alter table practice_game.play_events add column if not exists panel integer check(panel between 1 and 4);
alter table practice_game.play_events drop constraint if exists play_events_event_check;
alter table practice_game.play_events add constraint play_events_event_check check(event in ('drill_started','drill_submitted','level_passed','placement_done','streak_extended','freeze_used','badge_earned','readiness_changed','mock_prompt_shown','mock_started_from_prompt','intro_shown','intro_skipped','intro_completed','first_topic_started_from_intro'));
-- Only the verified admin data function sets this transaction-local read flag.
-- No extra browser grants and no access to private drill evidence.
do $$ begin
 if not exists(select 1 from pg_policies where schemaname='practice_game' and tablename='play_events' and policyname='server_admin_events') then
  create policy server_admin_events on practice_game.play_events for select to mockmeai_reporting using(current_setting('mockmeai.admin_read',true)='true');
 end if;
end $$;
commit;
