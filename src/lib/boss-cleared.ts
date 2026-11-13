import "server-only";
import { withPlayer } from "@/lib/play/database";
/** A persisted boss pass is the only evidence accepted for this moment. */
export function claimBossWorldCleared(userId: string) {
  return withPlayer(userId, async (sql) => {
    const [passed] =
      await sql`select 1 from practice_game.boss_attempts where user_id=${userId} and passed=true`;
    if (!passed) return { show: false };
    const rows =
      await sql`insert into practice_game.mock_access(user_id,world_cleared_seen_at) values(${userId},now()) on conflict(user_id) do update set world_cleared_seen_at=excluded.world_cleared_seen_at,updated_at=now() where mock_access.world_cleared_seen_at is null returning user_id`;
    return { show: rows.length > 0 };
  });
}
