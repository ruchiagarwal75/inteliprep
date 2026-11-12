import { dailyGoal } from "./daily-goal";
import { ageReadiness } from "./readiness-store";
import { refreshStreak } from "./streak-store";
import "server-only";
import { cache } from "react";
import { z } from "zod";
import { ensurePlayer, withPlayer } from "./database";
const stateSchema = z.object({
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
  reviews: z.array(z.object({ topic: z.string(), count: z.number().int() })),
});
export type PlayerSnapshot = z.infer<typeof stateSchema>;
async function readPlayerSnapshot(userId: string) {
  return withPlayer(userId, async (sql) => {
    await ensurePlayer(sql, userId);
    await refreshStreak(sql, userId);
    await ageReadiness(sql, userId);
    const [row] = await sql`select jsonb_build_object(
   'points',(select coalesce(sum(delta),0) from practice_game.points_ledger),
   'streak',s.current,'freezes',s.freezes_available,'level',p.chosen_level,'timeZone',p.time_zone,'zoneSet',p.zone_set,
   'levels',(select coalesce(jsonb_agg(to_jsonb(l)-'user_id'),'[]'::jsonb) from practice_game.level_progress l),
   'readiness',(select coalesce(jsonb_agg(to_jsonb(r)-'user_id'),'[]'::jsonb) from practice_game.topic_readiness r),
   'badges',(select coalesce(jsonb_agg(to_jsonb(b)-'user_id'),'[]'::jsonb) from practice_game.badges b),
   'reviews',(select coalesce(jsonb_agg(q),'[]'::jsonb) from (select topic,count(*)::integer as count from practice_game.review_queue where due_at<=now() group by topic)q)
  ) as state from practice_game.player_profiles p join practice_game.streaks s using(user_id) where p.user_id=${userId}`;
    return stateSchema.parse({
      ...row?.state,
      dailyGoal: await dailyGoal(sql, userId),
    });
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

export const playerSnapshot = cache(readPlayerSnapshot);
