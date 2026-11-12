-- Reading position is independent of completion. Existing rows and RLS stay intact.
alter table practice_game.course_visits
  add column if not exists last_viewed_index integer
  check (last_viewed_index >= 0);
