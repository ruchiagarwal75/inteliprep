-- Expand level constraints only. Existing rows, policies and grants remain unchanged.
alter table practice_game.play_sessions drop constraint if exists play_sessions_check;
alter table practice_game.play_sessions add constraint play_sessions_check check(
 (mode='level' and (level between 1 and 100 or (topic='rag-course' and level=0)))
 or (mode<>'level' and level is null));
alter table practice_game.drill_attempts drop constraint if exists drill_attempts_level_check;
alter table practice_game.drill_attempts add constraint drill_attempts_level_check
 check(level between 1 and 100 or (topic='rag-course' and level=0));
alter table practice_game.level_progress drop constraint if exists level_progress_level_check;
alter table practice_game.level_progress add constraint level_progress_level_check
 check(level between 1 and 100 or (topic='rag-course' and level=0));
alter table practice_game.review_queue drop constraint if exists review_queue_level_check;
alter table practice_game.review_queue add constraint review_queue_level_check
 check(level between 1 and 100 or (topic='rag-course' and level=0));
alter table practice_game.course_visits drop constraint if exists course_visits_level_check;
alter table practice_game.course_visits add constraint course_visits_level_check check(level between 0 and 9);
