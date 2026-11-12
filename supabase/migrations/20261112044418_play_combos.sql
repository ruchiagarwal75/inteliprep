-- Server-owned counters. No saved answers, results or ledger rows are changed.
alter table practice_game.play_sessions add column if not exists current_combo integer not null default 0 check(current_combo>=0);
alter table practice_game.play_sessions add column if not exists best_combo integer not null default 0 check(best_combo>=current_combo);
