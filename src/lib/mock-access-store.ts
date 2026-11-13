import "server-only";
import { z } from "zod";
import { configuredAdminId } from "@/lib/admin-config";
import type { MockAccess } from "@/lib/mock-access-public";
import { withPlayer, type PlayTransaction } from "@/lib/play/database";

const rowSchema = z.object({
  plan: z.enum(["free", "pro"]),
  free_boss_used_at: z.coerce.date().nullable(),
  free_boss_session_id: z.uuid().nullable(),
  pro_interest_at: z.coerce.date().nullable(),
  world_cleared_seen_at: z.coerce.date().nullable(),
});
export async function storedMockAccess(
  sql: PlayTransaction,
  userId: string,
): Promise<MockAccess> {
  const [row] =
    await sql`select * from practice_game.mock_access where user_id=${userId}`;
  const data = row ? rowSchema.parse(row) : null;
  const admin = userId === configuredAdminId();
  return {
    plan: admin ? "pro" : (data?.plan ?? "free"),
    admin,
    freeBossUsedAt: data?.free_boss_used_at?.toISOString() ?? null,
    freeBossSessionId: data?.free_boss_session_id ?? null,
    proInterestAt: data?.pro_interest_at?.toISOString() ?? null,
    worldClearedSeenAt: data?.world_cleared_seen_at?.toISOString() ?? null,
  };
}
/** Callers supply only an identity already verified at the page/API boundary. */
export function mockAccess(userId: string) {
  return withPlayer(userId, (sql) => storedMockAccess(sql, userId));
}
export function recordProInterest(userId: string) {
  return withPlayer(userId, async (sql) => {
    await sql`insert into practice_game.mock_access(user_id,pro_interest_at) values(${userId},now()) on conflict(user_id) do update set pro_interest_at=coalesce(mock_access.pro_interest_at,excluded.pro_interest_at),updated_at=now()`;
    return { saved: true };
  });
}
