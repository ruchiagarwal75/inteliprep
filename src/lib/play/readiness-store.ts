import "server-only";
import { z } from "zod";
import type { PlayTransaction } from "./database";
import { levelsForTopic, playTopic } from "./catalog";
import {
  afterDrill,
  afterVerifiedMock,
  currentReadiness,
  shownReadiness,
} from "./readiness-policy";
import type { CareerLevel, ReadinessRecord } from "./readiness-policy";
import { recordPlayEvent } from "./events";
import { awardBadge } from "./badges";
import type { BadgeId } from "./badges";
import { withPlayer } from "./database";
import { PlayError } from "./errors";
const rowSchema = z.object({
  state: z.enum(["not_tested", "gap", "practice_ready", "interview_ready"]),
  verified_level: z.enum(["mid", "senior", "staff"]).nullable(),
  last_activity_at: z.coerce.date().nullable(),
  ready_at: z.coerce.date().nullable(),
});
async function storedReadiness(
  sql: PlayTransaction,
  userId: string,
  topic: string,
) {
  const [row] =
    await sql`select state,verified_level,last_activity_at,ready_at from practice_game.topic_readiness where user_id=${userId} and topic=${topic}`;
  if (!row)
    return {
      record: {
        state: "not_tested",
        verifiedLevel: null,
        lastActivityAt: null,
      } satisfies ReadinessRecord,
      readyAt: null,
    };
  const data = rowSchema.parse(row);
  return {
    record: {
      state: data.state,
      verifiedLevel: data.verified_level,
      lastActivityAt: data.last_activity_at?.toISOString() ?? null,
    },
    readyAt: data.ready_at?.toISOString() ?? null,
  };
}
export async function ageReadiness(
  sql: PlayTransaction,
  userId: string,
  now = new Date(),
) {
  const rows =
    await sql`select topic,state,verified_level,last_activity_at,ready_at from practice_game.topic_readiness where user_id=${userId} and state='interview_ready'`;
  for (const row of rows) {
    const data = rowSchema.parse(row),
      record = {
        state: data.state,
        verifiedLevel: data.verified_level,
        lastActivityAt: data.last_activity_at?.toISOString() ?? null,
      };
    if (currentReadiness(record, now) !== "interview_ready") {
      await sql`update practice_game.topic_readiness set state='practice_ready',updated_at=${now} where user_id=${userId} and topic=${row.topic}`;
      await recordPlayEvent(
        sql,
        userId,
        "readiness_changed",
        `${row.topic}:expired:${record.lastActivityAt}`,
        { topic: row.topic },
      );
    }
  }
}
async function writeReadiness(
  sql: PlayTransaction,
  userId: string,
  topic: string,
  old: ReadinessRecord,
  next: ReadinessRecord,
  now: Date,
) {
  await sql`insert into practice_game.topic_readiness(user_id,topic,state,verified_level,last_activity_at,ready_at) values(${userId},${topic},${next.state},${next.verifiedLevel},${next.lastActivityAt},${next.state === "practice_ready" || next.state === "interview_ready" ? now : null}) on conflict(user_id,topic) do update set state=excluded.state,verified_level=excluded.verified_level,last_activity_at=excluded.last_activity_at,ready_at=coalesce(topic_readiness.ready_at,excluded.ready_at),updated_at=${now}`;
  if (old.state !== next.state || old.verifiedLevel !== next.verifiedLevel)
    await recordPlayEvent(
      sql,
      userId,
      "readiness_changed",
      `${topic}:${next.state}:${next.verifiedLevel ?? ""}:${now.toISOString()}`,
      { topic },
    );
}
export async function recordDrillReadiness(
  sql: PlayTransaction,
  userId: string,
  topic: string,
) {
  const now = new Date(),
    old = await storedReadiness(sql, userId, topic),
    levels = levelsForTopic(topic),
    passed =
      await sql`select level from practice_game.level_progress where user_id=${userId} and topic=${topic} and status='passed'`;
  const allPassed =
    levels.length > 0 &&
    levels.every((level) => passed.some((row) => row.level === level.level));
  const next = afterDrill(old.record, allPassed, now);
  await writeReadiness(sql, userId, topic, old.record, next, now);
  const badges: BadgeId[] = [],
    badgeId = playTopic(topic)?.practiceBadgeId;
  if (allPassed && badgeId) {
    const badge = await awardBadge(sql, userId, badgeId);
    if (badge) badges.push(badge);
  }
  const becamePracticeReady =
    next.state === "practice_ready" &&
    currentReadiness(old.record, now) !== "practice_ready";
  const config = playTopic(topic);
  const [profile] =
    await sql`select chosen_level from practice_game.player_profiles where user_id=${userId}`;
  const prompt =
    becamePracticeReady && config?.mockProblemId
      ? {
          topic,
          title: config.title,
          problemId: config.mockProblemId,
          level: z.enum(["mid", "senior", "staff"]).parse(profile.chosen_level),
        }
      : undefined;
  return { becamePracticeReady, badges, prompt };
}
export async function recordMockReadiness(
  sql: PlayTransaction,
  userId: string,
  topic: string,
  level: CareerLevel,
) {
  const now = new Date(),
    old = await storedReadiness(sql, userId, topic),
    next = afterVerifiedMock(old.record, level, now);
  await writeReadiness(sql, userId, topic, old.record, next, now);
  const badgeId = playTopic(topic)?.interviewBadgeId;
  if (badgeId) await awardBadge(sql, userId, badgeId);
}
export async function touchTopic(
  sql: PlayTransaction,
  userId: string,
  topic: string,
) {
  await ageReadiness(sql, userId);
  await sql`update practice_game.topic_readiness set last_activity_at=now() where user_id=${userId} and topic=${topic}`;
}
export async function markMockPromptSeen(userId: string, topic: string) {
  if (!playTopic(topic)?.available)
    throw new PlayError("This topic is not open yet.", 404);
  return withPlayer(userId, async (sql) => {
    await ageReadiness(sql, userId);
    const old = await storedReadiness(sql, userId, topic),
      [profile] =
        await sql`select chosen_level from practice_game.player_profiles where user_id=${userId}`;
    if (!profile)
      throw new PlayError("This mock prompt is not ready yet.", 409);
    const level = z
      .enum(["mid", "senior", "staff"])
      .parse(profile.chosen_level);
    if (shownReadiness(old.record, level, new Date()) !== "practice_ready")
      throw new PlayError("This mock prompt is not ready yet.", 409);
    const rows =
      await sql`update practice_game.topic_readiness set prompt_seen_at=now() where user_id=${userId} and topic=${topic} and prompt_seen_at is null returning topic`;
    if (rows.length)
      await recordPlayEvent(sql, userId, "mock_prompt_shown", topic, { topic });
    return { saved: true };
  });
}
