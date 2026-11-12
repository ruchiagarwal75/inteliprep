-- Add earned stars to legacy passes without changing scores, attempts or XP.
-- Current placement passes intentionally have no stars and are excluded.
update practice_game.level_progress as progress
set best_stars = case when best_score = 1 then 2 else 1 end
where status = 'passed'
  and best_stars = 0
  and best_score >= 0.8
  and not exists (
    select 1
    from practice_game.play_sessions as session
    where session.user_id = progress.user_id
      and session.topic = progress.topic
      and session.result_json ? 'stars'
      and session.result_json->'passedLevels' @> jsonb_build_array(progress.level)
      and session.created_at <= progress.passed_at
  );
