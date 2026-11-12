-- Additive game metadata. Old results and balances are left intact.
alter table practice_game.level_progress add column if not exists best_stars integer not null default 0 check (best_stars between 0 and 3);
alter table practice_game.play_sessions add column if not exists replay boolean not null default false;
