import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAdminIdentity } from "@/lib/admin-auth";
import { withPlayer } from "@/lib/play/database";
import { storedMockAccess } from "@/lib/mock-access-store";

export const adminMockAccessInput = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("plan"), plan: z.enum(["free", "pro"]) }),
  z.strictObject({ action: z.literal("reset_free_attempt") }),
]);
export async function adminMockAccess(userId: string) {
  await requireAdminIdentity();
  z.uuid().parse(userId);
  return withPlayer(userId, async (sql) => ({
    access: await storedMockAccess(sql, userId),
    changes: await sql<
      { action: string; actor_id: string | null; created_at: Date }[]
    >`select action,actor_id,created_at from practice_game.mock_access_changes where user_id=${userId} order by created_at desc,id limit 10`,
  }));
}
export async function changeMockAccess(userId: string, input: unknown) {
  const actor = await requireAdminIdentity();
  z.uuid().parse(userId);
  const command = adminMockAccessInput.parse(input);
  return withPlayer(userId, async (sql) => {
    const before = await storedMockAccess(sql, userId);
    if (command.action === "plan") {
      if (before.admin || before.plan === command.plan) return before;
      await sql`insert into practice_game.mock_access(user_id,plan) values(${userId},${command.plan}) on conflict(user_id) do update set plan=excluded.plan,updated_at=now()`;
      await sql`insert into practice_game.mock_access_changes(id,user_id,actor_id,action,old_plan,new_plan) values(${randomUUID()},${userId},${actor},'plan_changed',${before.plan},${command.plan})`;
    } else if (before.freeBossSessionId) {
      // Release the path node too. Keep the old interview and checkpoint resumable.
      await sql`update practice_game.boss_attempts set refunded_at=now(),refund_category='admin_reset' where user_id=${userId} and session_id=${before.freeBossSessionId} and ended_at is null and refunded_at is null`;
      await sql`update practice_game.mock_access set free_boss_used_at=null,free_boss_session_id=null,updated_at=now() where user_id=${userId}`;
      await sql`insert into practice_game.mock_access_changes(id,user_id,actor_id,action,session_id) values(${randomUUID()},${userId},${actor},'free_attempt_reset',${before.freeBossSessionId})`;
    }
    return storedMockAccess(sql, userId);
  });
}
