import { displayRoundSummary } from "./summary-store";
import { recordPlayEvent } from "./events";
import "server-only";
import { z } from "zod";
import type { PlayTransaction } from "./database";
import { drillDefinitionSchema, drillVariantSchema } from "./definition";
import {
  drillAnswerSchema,
  drillResultSchema,
  roundSummarySchema,
  roundViewSchema,
} from "./public";
import { publicQuestion } from "./question";
import { PlayError } from "./errors";
const roundSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  topic: z.string(),
  level: z.number().int().nullable(),
  mode: z.enum(["level", "placement", "review"]),
  active_ordinal: z.number().int(),
  completed_at: z.coerce.date().nullable(),
  result_json: roundSummarySchema.nullable(),
});
const attemptSchema = z.object({
  id: z.uuid(),
  session_id: z.uuid(),
  drill_id: z.string(),
  level: z.number().int(),
  topic: z.string(),
  ordinal: z.number().int(),
  private_variant: z.object({
    definition: drillDefinitionSchema,
    variant: drillVariantSchema,
  }),
  answer: drillAnswerSchema.nullable(),
  correct: z.boolean().nullable(),
  score: z.coerce.number().nullable(),
  points_awarded: z.number().int(),
  time_ms: z.coerce.number().nullable(),
  started_at: z.coerce.date().nullable(),
  submitted_at: z.coerce.date().nullable(),
  claim_id: z.uuid().nullable(),
  claim_until: z.coerce.date().nullable(),
  result_json: drillResultSchema.nullable(),
});
export async function storedRound(
  sql: PlayTransaction,
  userId: string,
  id: string,
) {
  const [row] =
    await sql`select * from practice_game.play_sessions where id=${id} and user_id=${userId}`;
  if (!row) throw new PlayError("This round was not found.", 404);
  return roundSchema.parse(row);
}
export async function storedAttempt(
  sql: PlayTransaction,
  userId: string,
  id: string,
) {
  const [row] =
    await sql`select * from practice_game.drill_attempts where id=${id} and user_id=${userId}`;
  if (!row) throw new PlayError("This drill was not found.", 404);
  return attemptSchema.parse(row);
}
export async function roundView(
  sql: PlayTransaction,
  userId: string,
  id: string,
) {
  const [row] =
    await sql`select to_jsonb(s) as round,to_jsonb(a) as attempt,(select jsonb_agg(d.correct order by d.ordinal) from practice_game.drill_attempts d where d.session_id=s.id and d.user_id=${userId}) as outcomes from practice_game.play_sessions s left join practice_game.drill_attempts a on a.session_id=s.id and a.user_id=s.user_id and a.ordinal=s.active_ordinal where s.id=${id} and s.user_id=${userId}`;
  if (!row) throw new PlayError("This round was not found.", 404);
  const round = roundSchema.parse(row.round);
  if (!row.attempt)
    throw new PlayError("This round has no question to show.", 409);
  let attempt = attemptSchema.parse(row.attempt);
  const outcomes = z.array(z.boolean().nullable()).parse(row.outcomes);
  const resumed = Boolean(attempt.started_at);
  if (!attempt.started_at) {
    await sql`update practice_game.drill_attempts set started_at=now() where id=${attempt.id} and user_id=${userId} and started_at is null`;
    await recordPlayEvent(sql, userId, "drill_started", attempt.id, {
      topic: attempt.topic,
      type: attempt.private_variant.definition.type,
    });
    attempt = await storedAttempt(sql, userId, attempt.id);
  }
  if (!attempt.started_at) throw Error("Missing server drill start");
  const base = {
    sessionId: id,
    mode: round.mode,
    resumed,
    outcomes,
    question: publicQuestion(
      attempt.private_variant.definition,
      attempt.private_variant.variant,
      {
        id: attempt.id,
        ordinal: attempt.ordinal,
        startedAt: attempt.started_at.toISOString(),
      },
      outcomes.length,
    ),
  };
  if (attempt.result_json && attempt.answer)
    return roundViewSchema.parse({
      ...base,
      status: "graded",
      answer: attempt.answer,
      result: attempt.result_json,
      ...(round.result_json
        ? {
            summary: await displayRoundSummary(
              sql,
              userId,
              id,
              round.result_json,
            ),
          }
        : {}),
    });
  if (attempt.answer)
    return roundViewSchema.parse({
      ...base,
      status: "grading",
      answer: attempt.answer,
      retryAfter: Math.max(
        0,
        Math.ceil(((attempt.claim_until?.getTime() ?? 0) - Date.now()) / 1000),
      ),
    });
  return roundViewSchema.parse({ ...base, status: "answering" });
}
