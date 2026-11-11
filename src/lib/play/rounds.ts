import "server-only";
import { randomUUID } from "node:crypto";
import type { StartRoundInput } from "./public";
import type { DrillDefinition } from "./definition";
import { drillDefinitionSchema } from "./definition";
import { playTopic, levelsForTopic } from "./catalog";
import { withPlayer, ensurePlayer } from "./database";
import { drillsForTopic } from "./content";
import {
  chooseLevelDrills,
  choosePlacementDrills,
  levelUnlocked,
} from "./round-rules";
import { createVariant } from "./question";
import { roundView, storedRound } from "./round-store";
import { PlayError } from "./errors";
export async function startRound(userId: string, input: StartRoundInput) {
  return withPlayer(userId, async (sql) => {
    await ensurePlayer(sql, userId);
    const topic = playTopic(input.topic);
    if (!topic?.available)
      throw new PlayError("This topic is not open yet.", 404);
    const level = input.mode === "level" ? input.level : null;
    const [existing] =
      await sql`select id,topic,mode,level from practice_game.play_sessions where user_id=${userId} and request_id=${input.requestId}`;
    if (existing) {
      if (
        existing.topic !== input.topic ||
        existing.mode !== input.mode ||
        existing.level !== level
      )
        throw new PlayError(
          "This start request belongs to another round.",
          409,
        );
      return { sessionId: existing.id };
    }
    const [active] =
      await sql`select id from practice_game.play_sessions where user_id=${userId} and topic=${input.topic} and mode=${input.mode} and level is not distinct from ${level} and completed_at is null order by created_at desc limit 1`;
    if (active) return { sessionId: active.id };
    await sql`update practice_game.player_profiles set time_zone=case when zone_set then time_zone else ${input.timeZone} end,zone_set=true where user_id=${userId}`;
    const levels = levelsForTopic(input.topic);
    for (const [index, item] of levels.entries())
      await sql`insert into practice_game.level_progress(user_id,topic,level,status) values(${userId},${input.topic},${item.level},${index === 0 ? "open" : "locked"}) on conflict do nothing`;
    const bank = drillsForTopic(input.topic);
    let selected: DrillDefinition[];
    if (input.mode === "level") {
      const rows =
        await sql`select level from practice_game.level_progress where user_id=${userId} and topic=${input.topic} and status='passed'`;
      if (
        !levelUnlocked(
          input.level,
          levels,
          rows.map((row) => Number(row.level)),
        )
      )
        throw new PlayError("Pass the previous level to open this one.", 403);
      selected = chooseLevelDrills(bank, input.level);
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
    const id = randomUUID();
    await sql`insert into practice_game.play_sessions(id,user_id,request_id,topic,level,mode) values(${id},${userId},${input.requestId},${input.topic},${level},${input.mode})`;
    for (const [ordinal, drill] of selected.entries())
      await sql`insert into practice_game.drill_attempts(id,user_id,session_id,drill_id,topic,level,type,ordinal,private_variant) values(${randomUUID()},${userId},${id},${drill.id},${drill.topic},${drill.level},${drill.type},${ordinal},${sql.json({ definition: drill, variant: createVariant(drill) })}::jsonb)`;
    return { sessionId: id };
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
