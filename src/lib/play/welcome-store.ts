import "server-only";
import { randomUUID } from "node:crypto";
import { cache } from "react";
import { z } from "zod";
import { withPlayer, type PlayTransaction } from "./database";
import { PlayError } from "./errors";
import type { WelcomeFinish } from "./welcome-public";
import { recordPlayEvent } from "./events";

async function required(sql: PlayTransaction, userId: string) {
  await sql`insert into practice_game.welcome_state(user_id) values(${userId}) on conflict do nothing`;
  const [row] = await sql`select welcome_seen_at is not null as seen,
   exists(select 1 from practice_game.play_sessions) or
   exists(select 1 from practice_game.course_visits) or
   exists(select 1 from practice_game.level_progress where status='passed' or best_score>0) or
   exists(select 1 from practice_game.points_ledger) or
   exists(select 1 from practice_game.badges) or
   exists(select 1 from practice_game.topic_readiness where state<>'not_tested') as progressed
   from practice_game.welcome_state where user_id=${userId}`;
  if (row?.progressed && !row.seen)
    await sql`update practice_game.welcome_state set welcome_seen_at=now() where user_id=${userId}`;
  return !row?.seen && !row?.progressed;
}
/** Profile/time-zone initialization alone is not practice progress. */
export const welcomeRequired = cache((userId: string) =>
  withPlayer(userId, (sql) => required(sql, userId)),
);
export async function openWelcome(
  userId: string,
  replay: boolean,
  requestId: string = randomUUID(),
) {
  return withPlayer(userId, async (sql) => {
    if (!replay && !(await required(sql, userId))) return null;
    if (!replay) {
      const [prior] =
        await sql`select id from practice_game.welcome_runs where user_id=${userId} and kind='auto'`;
      if (prior) {
        const id = z.uuid().parse(prior.id);
        await recordPlayEvent(sql, userId, "intro_shown", id);
        return id;
      }
    }
    const [existing] =
      await sql`select id from practice_game.welcome_runs where id=${requestId} and user_id=${userId}`;
    const id = existing ? z.uuid().parse(existing.id) : requestId;
    if (!existing) {
      const created =
        await sql`insert into practice_game.welcome_runs(id,user_id,kind) values(${id},${userId},${replay ? "replay" : "auto"}) on conflict do nothing returning id`;
      if (!created.length) throw new PlayError("Please reopen the intro.", 409);
    }
    await recordPlayEvent(sql, userId, "intro_shown", id);
    return id;
  });
}
/** The first ending wins, even across tabs or a retried response. */
export async function finishWelcome(userId: string, input: WelcomeFinish) {
  await withPlayer(userId, async (sql) => {
    const [run] =
      await sql`select finished_at,outcome,panel from practice_game.welcome_runs where id=${input.runId} and user_id=${userId}`;
    if (!run)
      throw new PlayError("This intro is unavailable. Please reopen it.", 404);
    if (run.finished_at) {
      await recordPlayEvent(
        sql,
        userId,
        run.outcome === "skipped" ? "intro_skipped" : "intro_completed",
        input.runId,
        { panel: Number(run.panel) },
      );
      return;
    }
    await sql`update practice_game.welcome_runs set finished_at=now(),outcome=${input.action === "skip" ? "skipped" : "completed"},panel=${input.panel} where id=${input.runId} and user_id=${userId}`;
    await sql`insert into practice_game.welcome_state(user_id,welcome_seen_at) values(${userId},now()) on conflict(user_id) do update set welcome_seen_at=coalesce(practice_game.welcome_state.welcome_seen_at,excluded.welcome_seen_at)`;
    await recordPlayEvent(
      sql,
      userId,
      input.action === "skip" ? "intro_skipped" : "intro_completed",
      input.runId,
      { panel: input.panel },
    );
  });
}
/** Count the actual Learn view, not a click that may never load. No rewards. */
export async function firstTopicFromIntro(userId: string, runId: string) {
  await withPlayer(userId, async (sql) => {
    const [run] =
      await sql`select id from practice_game.welcome_runs where id=${runId} and user_id=${userId} and outcome='completed'`;
    if (!run) return;
    await sql`update practice_game.welcome_runs set topic_started_at=coalesce(topic_started_at,now()) where id=${runId} and user_id=${userId}`;
    await recordPlayEvent(
      sql,
      userId,
      "first_topic_started_from_intro",
      "first-topic",
      { topic: "rag-course" },
    );
  });
}
