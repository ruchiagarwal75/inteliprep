import "server-only";
import { streakChange } from "./streak-policy";
import { currentReadiness } from "./readiness-policy";
import { playerXpLevel } from "./game-rules";
import { playerXpLevelSchema } from "./public";
import { cache } from "react";
import { z } from "zod";
import { ensurePlayer, withPlayer, readPlayer } from "./database";
const stateSchema = z.object({
  xpLevel: playerXpLevelSchema.optional(),
  dailyGoal: z.boolean().optional(),
  points: z.coerce.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  streak: z.number().int().nonnegative(),
  freezes: z.number().int().min(0).max(2),
  level: z.enum(["mid", "senior", "staff"]),
  timeZone: z.string(),
  zoneSet: z.boolean().optional(),
  levels: z.array(
    z.object({
      topic: z.string(),
      level: z.number().int(),
      status: z.enum(["locked", "open", "passed"]),
      best_score: z.coerce.number(),
      best_stars: z.number().int().min(0).max(3).default(0),
    }),
  ),
  readiness: z.array(
    z.object({
      topic: z.string(),
      state: z.enum(["not_tested", "gap", "practice_ready", "interview_ready"]),
      verified_level: z.enum(["mid", "senior", "staff"]).nullable(),
      last_activity_at: z.string().nullable(),
      prompt_seen_at: z.string().nullable(),
    }),
  ),
  badges: z.array(z.object({ badge_id: z.string(), earned_at: z.string() })),
  chests: z
    .array(
      z.object({
        topic: z.string(),
        after_level: z.number().int(),
        xp: z.number().int(),
      }),
    )
    .default([]),
  reviews: z.array(z.object({ topic: z.string(), count: z.number().int() })),
});
export type PlayerSnapshot = z.infer<typeof stateSchema>;
const storedStreakSchema = z.object({
  current: z.number().int().nonnegative(),
  longest: z.number().int().nonnegative(),
  freezesAvailable: z.number().int().min(0).max(2),
  lastActiveDate: z.string().nullable(),
  lastResolvedDate: z.string().nullable(),
});
/** Page reads project time-dependent values without writing earned progress. */
export async function readPlayerSnapshot(userId: string, now = new Date()) {
  return readPlayer(userId, async (sql) => {
    const [row] = await sql`select jsonb_build_object(
   'points',(select coalesce(sum(delta),0) from practice_game.points_ledger where user_id=${userId}),
   'streak',coalesce(s.current,0),'freezes',coalesce(s.freezes_available,0),'level',coalesce(p.chosen_level,'senior'),'timeZone',coalesce(p.time_zone,'UTC'),'zoneSet',coalesce(p.zone_set,false),
   'levels',(select coalesce(jsonb_agg(to_jsonb(l)-'user_id'),'[]'::jsonb) from practice_game.level_progress l where user_id=${userId}),
   'readiness',(select coalesce(jsonb_agg(to_jsonb(r)-'user_id'),'[]'::jsonb) from practice_game.topic_readiness r where user_id=${userId}),
   'chests',(select coalesce(jsonb_agg(to_jsonb(c)-'user_id'),'[]'::jsonb) from practice_game.chest_opens c where user_id=${userId}),
   'badges',(select coalesce(jsonb_agg(to_jsonb(b)-'user_id'),'[]'::jsonb) from practice_game.badges b where user_id=${userId}),
   'reviews',(select coalesce(jsonb_agg(q),'[]'::jsonb) from (select topic,count(*)::integer as count from practice_game.review_queue where user_id=${userId} and due_at<=${now} group by topic)q),
   'dailyGoal',exists(select 1 from practice_game.play_sessions g where g.user_id=${userId} and g.completed_at>=${now}::timestamptz-interval '48 hours' and (g.completed_at at time zone coalesce(p.time_zone,'UTC'))::date=(${now}::timestamptz at time zone coalesce(p.time_zone,'UTC'))::date)
  ) as state,
  jsonb_build_object('current',coalesce(s.current,0),'longest',coalesce(s.longest,0),'freezesAvailable',coalesce(s.freezes_available,0),'lastActiveDate',s.last_active_date::text,'lastResolvedDate',s.last_resolved_date::text) as streak
  from (select ${userId}::uuid as user_id) u left join practice_game.player_profiles p using(user_id) left join practice_game.streaks s using(user_id)`;
    const state = stateSchema.parse(row?.state);
    const streak = streakChange(
      storedStreakSchema.parse(row?.streak),
      now,
      state.timeZone,
      false,
    ).state;
    return {
      ...state,
      streak: streak.current,
      freezes: streak.freezesAvailable,
      xpLevel: playerXpLevel(state.points),
      readiness: state.readiness.map((entry) => ({
        ...entry,
        state: currentReadiness(
          {
            state: entry.state,
            verifiedLevel: entry.verified_level,
            lastActivityAt: entry.last_activity_at,
          },
          now,
        ),
      })),
    } satisfies PlayerSnapshot;
  });
}
export const profileInputSchema = z
  .object({
    timeZone: z
      .string()
      .min(1)
      .max(100)
      .refine((value) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }, "Choose a valid time zone"),
    level: z.enum(["mid", "senior", "staff"]).optional(),
  })
  .strict();
export async function updatePlayer(
  userId: string,
  input: z.infer<typeof profileInputSchema>,
) {
  await withPlayer(userId, async (sql) => {
    await ensurePlayer(sql, userId);
    await sql`update practice_game.player_profiles set time_zone=case when zone_set then time_zone else ${input.timeZone} end,zone_set=true,chosen_level=coalesce(${input.level ?? null},chosen_level),updated_at=now() where user_id=${userId}`;
  });
  return playerSnapshot(userId);
}

export const playerSnapshot = cache((userId: string) =>
  readPlayerSnapshot(userId),
);
