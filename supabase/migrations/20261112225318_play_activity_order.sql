-- Preserve all attempts and timing. Only order concurrent visibility updates.
alter table practice_game.drill_attempts
  add column if not exists activity_order bigint not null default 0
  check (activity_order between 0 and 9007199254740991);
