import { expect } from "vitest";
import type { Sql } from "postgres";
import {
  drillDefinitionSchema,
  drillVariantSchema,
} from "@/lib/play/definition";
import { drillAnswerSchema } from "@/lib/play/public";
import { startRound, advanceRound } from "@/lib/play/rounds";
import { submitRoundAnswer } from "@/lib/play/submit";
/** The answer lookup is available only to synthetic SQL fixtures, never the app. */
export async function completeCourseQuiz(
  operator: Sql,
  userId: string,
  level: number,
  correctAt: (index: number) => boolean,
) {
  const started = await startRound(userId, {
    topic: "rag-course",
    mode: "level",
    level,
    requestId: crypto.randomUUID(),
    timeZone: "UTC",
  });
  let view = started.view;
  const results = [];
  let summary;
  for (let index = 0; index < view.question.total; index++) {
    const [row] =
      await operator`select private_variant from practice_game.drill_attempts where id=${view.question.attemptId}`;
    const drill = drillDefinitionSchema.parse(row.private_variant.definition),
      variant = drillVariantSchema.parse(row.private_variant.variant);
    if (drill.type !== "spot_flaw") throw Error("Expected a course choice");
    const source = correctAt(index)
      ? drill.correctIndex
      : (drill.correctIndex + 1) % 4;
    const answer = drillAnswerSchema.parse({
      type: "spot_flaw",
      option: String(variant.order.indexOf(source)),
    });
    const result = await submitRoundAnswer(
      userId,
      view.question.attemptId,
      answer,
    );
    const retry = await submitRoundAnswer(
      userId,
      view.question.attemptId,
      answer,
    );
    expect(retry).toEqual(result);
    results.push(result.result);
    summary = result.summary;
    if (index < view.question.total - 1)
      view = await advanceRound(
        userId,
        started.sessionId,
        view.question.attemptId,
      );
  }
  if (!summary) throw Error("Missing completed quiz summary");
  return { summary, results, sessionId: started.sessionId };
}
