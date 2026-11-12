import "server-only";
import { RAG_COURSE_ID } from "./course/metadata";
import { createHash } from "node:crypto";
import { levelsForTopic } from "./catalog";
import { withPlayer } from "./database";
import { grantPoints } from "./rewards";
import { playerTotals } from "./totals";
import { PlayError } from "./errors";
/** Stable server-side prize. No client seed, retry count or random input is accepted. */
export function chestXp(userId: string, topic: string, afterLevel: number) {
  return (
    20 +
    (createHash("sha256")
      .update(JSON.stringify(["chest-v1", userId, topic, afterLevel]))
      .digest()
      .readUInt32BE(0) %
      31)
  );
}
export function openChest(userId: string, topic: string, afterLevel: number) {
  return withPlayer(userId, async (sql) => {
    if (topic === RAG_COURSE_ID && ![3, 6, 9].includes(afterLevel))
      throw new PlayError("This chest was not found.", 404);
    if (
      topic !== RAG_COURSE_ID &&
      !levelsForTopic(topic)
        .slice(0, -1)
        .some((row) => row.level === afterLevel)
    )
      throw new PlayError("This chest was not found.", 404);
    const [level] =
      await sql`select status from practice_game.level_progress where user_id=${userId} and topic=${topic} and level=${afterLevel}`;
    if (level?.status !== "passed")
      throw new PlayError(`Pass Level ${afterLevel} to open this chest.`, 403);
    await sql`insert into practice_game.chest_opens(user_id,topic,after_level,xp) values(${userId},${topic},${afterLevel},${chestXp(userId, topic, afterLevel)}) on conflict do nothing`;
    const [chest] =
      await sql`select xp from practice_game.chest_opens where user_id=${userId} and topic=${topic} and after_level=${afterLevel}`;
    const xp = Number(chest.xp);
    await grantPoints(sql, userId, xp, "chest", `${topic}:${afterLevel}`);
    return {
      xp,
      opened: true as const,
      totals: await playerTotals(sql, userId),
    };
  });
}
