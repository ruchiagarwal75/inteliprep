-- Compatible limit expansion for longer lessons. Existing rows and completion stay intact.
alter table practice_game.course_visits
  drop constraint if exists course_visits_seen_through_check;
alter table practice_game.course_visits
  add constraint course_visits_seen_through_check check (seen_through between 0 and 99);
