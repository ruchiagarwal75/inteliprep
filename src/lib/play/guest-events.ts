import "server-only";
import { withPlayer, ensurePlayer, readPlayer } from "./database";
import { recordPlayEvent } from "./events";
import { PlayError } from "./errors";

export async function startGuestPlayer(userId: string) {
  await withPlayer(userId, async (sql) => {
    await ensurePlayer(sql, userId);
    await recordPlayEvent(sql, userId, "guest_started", userId);
  });
}
export function guestPromptSeen(userId: string) {
  return readPlayer(userId, async (sql) => {
    const [row] =
      await sql`select exists(select 1 from practice_game.play_events where user_id=${userId} and event='guest_prompt_shown' and ref_id='first_drill') as seen`;
    return row?.seen === true;
  });
}
export function recordGuestPrompt(
  userId: string,
  reason: "first_drill" | "limit",
) {
  return withPlayer(userId, async (sql) => {
    if (reason === "first_drill") {
      const [done] =
        await sql`select 1 from practice_game.drill_attempts where user_id=${userId} and submitted_at is not null limit 1`;
      if (!done) throw new PlayError("Finish a drill first.", 409);
    }
    await recordPlayEvent(sql, userId, "guest_prompt_shown", reason);
  });
}
export function recordGuestUpgrade(userId: string) {
  return withPlayer(userId, (sql) =>
    recordPlayEvent(sql, userId, "guest_signed_in", userId),
  );
}
