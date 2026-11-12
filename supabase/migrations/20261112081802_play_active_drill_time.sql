-- Add timing metadata only. Existing answers, results and rewards are unchanged.
alter table practice_game.play_sessions add column if not exists last_activity_at timestamptz;
alter table practice_game.drill_attempts add column if not exists active_elapsed_ms bigint not null default 0 check(active_elapsed_ms>=0);
alter table practice_game.drill_attempts add column if not exists active_since timestamptz;
alter table practice_game.drill_attempts add column if not exists variant_revision integer not null default 0 check(variant_revision>=0);
-- Existing owner RLS and the reporting role's table privileges cover these columns.
-- Browser accounts still cannot edit private variants, timing or rewards.
