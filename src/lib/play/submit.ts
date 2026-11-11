import { recordDrillReadiness } from "./readiness-store";
import { rewardDrill, rewardRound } from "./rewards";
import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { DrillAnswer } from "./public";
import { withPlayer } from "./database";
import { storedAttempt, storedRound } from "./round-store";
import { gradeDrill } from "./grade";
import { completeRound } from "./completion";
import { reviewChange } from "./review-policy";
import { PlayError } from "./errors";
export async function submitRoundAnswer(
  userId: string,
  attemptId: string,
  answer: DrillAnswer,
  signal?: AbortSignal,
) {
  const claim = await withPlayer(userId, async (sql) => {
    const attempt = await storedAttempt(sql, userId, attemptId),
      round = await storedRound(sql, userId, attempt.session_id);
    if (attempt.result_json)
      return {
        kind: "cached" as const,
        result: attempt.result_json,
        summary: round.result_json ?? undefined,
      };
    if (round.active_ordinal !== attempt.ordinal || !attempt.started_at)
      throw new PlayError("Open the current drill before answering.", 409);
    if (attempt.private_variant.definition.type !== answer.type)
      throw new PlayError("The answer does not match this drill type.", 400);
    if (
      answer.type === "math" &&
      attempt.private_variant.definition.type === "math" &&
      !attempt.private_variant.definition.math.units.some(
        (unit) => unit.id === answer.unit,
      )
    )
      throw new PlayError("Choose a unit from the list.", 400);
    if (
      attempt.answer &&
      JSON.stringify(attempt.answer) !== JSON.stringify(answer)
    )
      throw new PlayError(
        "Your first answer is saved. Retry grading that answer.",
        409,
      );
    if (attempt.claim_until && attempt.claim_until.getTime() > Date.now())
      throw new PlayError(
        "Your answer is still being checked.",
        409,
        Math.ceil((attempt.claim_until.getTime() - Date.now()) / 1000),
      );
    const id = randomUUID(),
      timeMs =
        attempt.time_ms ??
        Math.max(0, Date.now() - attempt.started_at.getTime());
    await sql`update practice_game.drill_attempts set answer=${sql.json(answer)},time_ms=${timeMs},claim_id=${id},claim_until=${new Date(Date.now() + 45000)} where user_id=${userId} and id=${attemptId}`;
    return { kind: "claimed" as const, id, attempt, timeMs };
  });
  if (claim.kind === "cached")
    return { result: claim.result, summary: claim.summary };
  try {
    const grade = await gradeDrill(
      claim.attempt.private_variant.definition,
      claim.attempt.private_variant.variant,
      answer,
      signal,
    );
    return await withPlayer(userId, async (sql) => {
      const attempt = await storedAttempt(sql, userId, attemptId),
        round = await storedRound(sql, userId, attempt.session_id);
      if (attempt.result_json)
        return {
          result: attempt.result_json,
          summary: round.result_json ?? undefined,
        };
      if (attempt.claim_id !== claim.id)
        throw new PlayError(
          "This check was replaced by a newer retry. Load the round again.",
          409,
        );
      const rewards = await rewardDrill(sql, userId, attempt, grade);
      const result = {
        ...grade,
        points: rewards.points,
        timeMs: claim.timeMs,
        badgesEarned: rewards.badges,
      };
      await sql`update practice_game.drill_attempts set correct=${result.correct},score=${result.score},points_awarded=${result.points},submitted_at=now(),claim_id=null,claim_until=null,result_json=${sql.json(result)} where user_id=${userId} and id=${attemptId}`;
      const [queued] =
        await sql`select step from practice_game.review_queue where user_id=${userId} and drill_id=${attempt.drill_id}`;
      const current = queued
        ? z
            .union([z.literal(2), z.literal(5), z.literal(12)])
            .parse(queued.step)
        : undefined;
      const review = reviewChange({
        correct: result.correct,
        reviewing: round.mode === "review",
        currentStep: current,
        now: new Date(),
      });
      if (review.kind === "remove")
        await sql`delete from practice_game.review_queue where user_id=${userId} and drill_id=${attempt.drill_id}`;
      if (review.kind === "schedule")
        await sql`insert into practice_game.review_queue(user_id,drill_id,topic,level,due_at,step) values(${userId},${attempt.drill_id},${attempt.topic},${attempt.level},${review.dueAt},${review.step}) on conflict(user_id,drill_id) do update set due_at=excluded.due_at,step=excluded.step,updated_at=now()`;
      const completed = await completeRound(sql, userId, attempt.session_id);
      const readiness = await recordDrillReadiness(sql, userId, attempt.topic);
      const summary = completed
        ? await rewardRound(
            sql,
            userId,
            attempt.session_id,
            {
              ...completed,
              practiceReadyNow: readiness.becamePracticeReady,
              mockPrompt: readiness.prompt,
            },
            [...rewards.badges, ...readiness.badges],
          )
        : undefined;
      return { result, summary };
    });
  } catch (cause) {
    await withPlayer(
      userId,
      (sql) =>
        sql`update practice_game.drill_attempts set claim_id=null,claim_until=null where user_id=${userId} and id=${attemptId} and claim_id=${claim.id} and submitted_at is null`,
    ).catch(() => {});
    throw cause;
  }
}
