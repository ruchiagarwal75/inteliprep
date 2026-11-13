import "server-only";
import { RAG_COURSE_ID } from "./course/metadata";
import { requireCourseSlides } from "./course/visits";
import { GAME_RULES } from "./game-rules";
import { roundTimingPath } from "./round-timing";
import { randomUUID } from "node:crypto";
import type { StartRoundInput } from "./public";
import { roundViewSchema } from "./public";
import type { DrillDefinition } from "./definition";
import { drillDefinitionSchema } from "./definition";
import { playTopic, levelsForTopic } from "./catalog";
import { withPlayer } from "./database";
import { drillsForTopic } from "./content";
import {
  chooseLevelDrills,
  choosePlacementDrills,
  levelUnlocked,
} from "./round-rules";
import { createVariant, publicQuestion } from "./question";
import { roundView, storedRound } from "./round-store";
import { recordPlayEvent } from "./events";
import { PlayError } from "./errors";
export async function startRound(userId: string, input: StartRoundInput) {
  return withPlayer(userId, async (sql) => {
    const topic = playTopic(input.topic);
    if (!topic?.available)
      throw new PlayError("This topic is not open yet.", 404);
    if (input.topic === RAG_COURSE_ID) {
      if (input.mode === "placement")
        throw new PlayError(
          "Choose a course topic to learn and take its quiz.",
          400,
        );
      if (input.mode === "level")
        await requireCourseSlides(sql, userId, input.level);
    }
    const level = input.mode === "level" ? input.level : null;
    const [existing] =
      await sql`select id,topic,mode,level,request_id=${input.requestId} as retry from practice_game.play_sessions where user_id=${userId} and (request_id=${input.requestId} or (topic=${input.topic} and mode=${input.mode} and level is not distinct from ${level} and completed_at is null)) order by (request_id=${input.requestId}) desc,created_at desc limit 1`;
    if (existing) {
      roundTimingPath("resume");
      if (
        existing.retry &&
        (existing.topic !== input.topic ||
          existing.mode !== input.mode ||
          existing.level !== level)
      )
        throw new PlayError(
          "This start request belongs to another round.",
          409,
        );
      return {
        sessionId: existing.id,
        view: await roundView(sql, userId, existing.id),
      };
    }
    roundTimingPath("fresh");
    await sql`with profile as (insert into practice_game.player_profiles(user_id,time_zone,zone_set) values(${userId},${input.timeZone},true) on conflict(user_id) do update set time_zone=case when player_profiles.zone_set then player_profiles.time_zone else excluded.time_zone end,zone_set=true returning user_id) insert into practice_game.streaks(user_id) select user_id from profile where true on conflict do nothing`;
    const levels = levelsForTopic(input.topic);
    const levelRows = levels.map((l, index) => ({
      level: l.level,
      status: index === 0 ? "open" : "locked",
    }));
    await sql`insert into practice_game.level_progress(user_id,topic,level,status) select ${userId},${input.topic},x.level,x.status from jsonb_to_recordset(${sql.json(levelRows)}) as x(level integer,status text) where true on conflict do nothing`;
    const bank = drillsForTopic(input.topic);
    let selected: DrillDefinition[];
    let replay = false;
    if (input.mode === "level") {
      const rows =
        await sql`select level from practice_game.level_progress where user_id=${userId} and topic=${input.topic} and status='passed'`;
      if (
        input.topic !== RAG_COURSE_ID &&
        !levelUnlocked(
          input.level,
          levels,
          rows.map((row) => Number(row.level)),
        )
      )
        throw new PlayError("Pass the previous level to open this one.", 403);
      replay = rows.some((row) => row.level === input.level);
      selected =
        input.topic === RAG_COURSE_ID
          ? bank.filter((drill) => drill.level === input.level)
          : chooseLevelDrills(bank, input.level);
    } else if (input.mode === "placement")
      selected = choosePlacementDrills(bank, topic.placementLevels);
    else {
      const due =
        await sql`select drill_id from practice_game.review_queue where user_id=${userId} and topic=${input.topic} and due_at<=now() order by due_at,drill_id limit 5`;
      selected = [];
      for (const row of due) {
        let drill = bank.find((d) => d.id === row.drill_id);
        if (!drill) {
          const [old] =
            await sql`select private_variant->'definition' as definition from practice_game.drill_attempts where user_id=${userId} and drill_id=${row.drill_id} order by created_at desc limit 1`;
          if (old) drill = drillDefinitionSchema.parse(old.definition);
        }
        if (drill) selected.push(drill);
      }
      if (!selected.length)
        throw new PlayError("No reviews are due for this topic yet.", 409);
    }
    const id = randomUUID(),
      startedAt = new Date().toISOString();
    const attempts = selected.map((drill, ordinal) => ({
      id: randomUUID(),
      drill_id: drill.id,
      topic: drill.topic,
      level: drill.level,
      drill_type: drill.type,
      ordinal,
      started_at: ordinal === 0 ? startedAt : null,
      active_since: ordinal === 0 ? startedAt : null,
      private_variant: { definition: drill, variant: createVariant(drill) },
    }));
    const first = attempts[0];
    if (!first) throw new PlayError("This round has no question to show.", 503);
    await sql`with session as (insert into practice_game.play_sessions(id,user_id,request_id,topic,level,mode,replay,last_activity_at) values(${id},${userId},${input.requestId},${input.topic},${level},${input.mode},${replay},now()) returning id) insert into practice_game.drill_attempts(id,user_id,session_id,drill_id,topic,level,type,ordinal,started_at,active_since,private_variant) select x.id,${userId},session.id,x.drill_id,x.topic,x.level,x.drill_type,x.ordinal,x.started_at,x.active_since,x.private_variant from session cross join jsonb_to_recordset(${sql.json(attempts)}) as x(id uuid,drill_id text,topic text,level integer,drill_type text,ordinal integer,started_at timestamptz,active_since timestamptz,private_variant jsonb)`;
    await recordPlayEvent(sql, userId, "drill_started", first.id, {
      topic: first.topic,
      type: first.drill_type,
    });
    const view = roundViewSchema.parse({
      sessionId: id,
      combo: 0,
      mode: input.mode,
      status: "answering",
      resumed: false,
      outcomes: attempts.map(() => null),
      question: publicQuestion(
        first.private_variant.definition,
        first.private_variant.variant,
        {
          id: first.id,
          ordinal: 0,
          startedAt,
          elapsedMs: 0,
          activityOrder: 0,
          maxTimeMs: 3 * GAME_RULES.parMs[first.drill_type],
          revision: 0,
        },
        attempts.length,
      ),
    });
    return { sessionId: id, view };
  });
}
export const getRound = (userId: string, id: string) =>
  withPlayer(userId, (sql) => roundView(sql, userId, id));
export function advanceRound(
  userId: string,
  id: string,
  afterAttemptId: string,
) {
  return withPlayer(userId, async (sql) => {
    const round = await storedRound(sql, userId, id);
    const [attempt] =
      await sql`select id,submitted_at from practice_game.drill_attempts where user_id=${userId} and session_id=${id} and ordinal=${round.active_ordinal}`;
    if (attempt?.id === afterAttemptId && !round.completed_at) {
      if (!attempt.submitted_at)
        throw new PlayError("Answer this drill before moving on.", 409);
      await sql`update practice_game.play_sessions set active_ordinal=active_ordinal+1 where id=${id} and user_id=${userId}`;
    }
    return roundView(sql, userId, id);
  });
}
