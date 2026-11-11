import "server-only";
import type { Scorecard } from "@/lib/scorecard";
import { currentCandidateId } from "@/lib/candidate-context";
import { reportingConfigured } from "@/lib/reporting-db";
import { ensurePlayer, withPlayer, type PlayTransaction } from "./database";
import { PLAY_TOPICS } from "./catalog";
import { mockOutcome } from "./mock-outcome";
import { grantPoints } from "./rewards";
import { recordMockReadiness, touchTopic } from "./readiness-store";
import { recordPlayEvent } from "./events";
import { logPlayFailure } from "./log";
/** Called only with a verified server scorecard. The ledger is the retry fence. */
export async function applyMockOutcome(
  sql: PlayTransaction,
  userId: string,
  interviewId: string,
  card: Scorecard,
) {
  const outcome = mockOutcome(card);
  if (!outcome) return;
  const [done] =
    await sql`select 1 from practice_game.points_ledger where user_id=${userId} and reason='mock' and ref_id=${interviewId}`;
  if (done) return;
  await ensurePlayer(sql, userId);
  await grantPoints(sql, userId, outcome.points, "mock", interviewId);
  const topic = PLAY_TOPICS.find((t) => t.mockProblemId === card.problemId);
  if (topic) {
    if (outcome.meetsBar)
      await recordMockReadiness(sql, userId, topic.id, card.level);
    else await touchTopic(sql, userId, topic.id);
  }
}
export async function observeMockCompletion(
  interviewId: string,
  card: Scorecard,
) {
  const userId = currentCandidateId();
  if (!userId || !reportingConfigured()) return;
  try {
    await withPlayer(userId, (sql) =>
      applyMockOutcome(sql, userId, interviewId, card),
    );
  } catch (cause) {
    logPlayFailure("mock_reward", cause);
  }
}
export async function observeMockStart(
  request: Request,
  interviewId: string,
  problemId: string,
  level: Scorecard["level"],
) {
  const userId = currentCandidateId();
  if (!userId || !reportingConfigured()) return;
  try {
    await withPlayer(userId, async (sql) => {
      await ensurePlayer(sql, userId);
      await sql`update practice_game.player_profiles set chosen_level=${level},updated_at=now() where user_id=${userId}`;
      const topic = PLAY_TOPICS.find((t) => t.mockProblemId === problemId);
      if (!topic) return;
      await touchTopic(sql, userId, topic.id);
      const referrer = request.headers.get("referer");
      if (!referrer) return;
      const url = new URL(referrer);
      if (
        url.origin !== new URL(request.url).origin ||
        url.searchParams.get("from") !== "play"
      )
        return;
      const [shown] =
        await sql`select 1 from practice_game.play_events where user_id=${userId} and event='mock_prompt_shown' and topic=${topic.id}`;
      if (shown)
        await recordPlayEvent(
          sql,
          userId,
          "mock_started_from_prompt",
          interviewId,
          { topic: topic.id },
        );
    });
  } catch (cause) {
    logPlayFailure("mock_start", cause);
  }
}
