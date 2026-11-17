begin;
alter table practice_game.play_events drop constraint if exists play_events_event_check;
alter table practice_game.play_events add constraint play_events_event_check check(event in (
  'drill_started','drill_submitted','level_passed','placement_done','streak_extended',
  'freeze_used','badge_earned','readiness_changed','mock_prompt_shown','mock_started_from_prompt',
  'intro_shown','intro_skipped','intro_completed','first_topic_started_from_intro',
  'guest_started','guest_first_drill_done','guest_prompt_shown','guest_signed_in'
));
commit;
