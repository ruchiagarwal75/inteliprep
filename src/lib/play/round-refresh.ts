import "server-only";
import { z } from "zod";
import type { PlayTransaction } from "./database";
import { drillDefinitionSchema, drillVariantSchema } from "./definition";
import { drillsForTopic } from "./content";
import { createVariant } from "./question";
import { ROUND_STALE_MS } from "./drill-time";
type RoundToRefresh = {
  id: string;
  topic: string;
  created_at: Date;
  last_activity_at: Date | null;
  completed_at: Date | null;
  active_ordinal: number;
};
/** Only unanswered snapshots change. Answered results, IDs, points and timing stay intact. */
export async function refreshUnanswered(
  sql: PlayTransaction,
  userId: string,
  round: RoundToRefresh,
  now = new Date(),
) {
  if (round.completed_at) return false;
  const [row] =
    await sql`select max(coalesce(submitted_at,started_at,created_at)) as latest from practice_game.drill_attempts where user_id=${userId} and session_id=${round.id}`;
  const latest = z.coerce.date().nullable().parse(row?.latest),
    last = new Date(
      Math.max(
        round.last_activity_at?.getTime() ?? 0,
        latest?.getTime() ?? 0,
        round.created_at.getTime(),
      ),
    );
  if (now.getTime() - last.getTime() < ROUND_STALE_MS) return false;
  const rows =
    await sql`select id,ordinal,private_variant from practice_game.drill_attempts where user_id=${userId} and session_id=${round.id} and answer is null and submitted_at is null order by ordinal`;
  const bank = drillsForTopic(round.topic);
  for (const row of rows) {
    const snapshot = z
      .object({
        definition: drillDefinitionSchema,
        variant: drillVariantSchema,
      })
      .parse(row.private_variant);
    const definition =
      bank.find((drill) => drill.id === snapshot.definition.id) ??
      snapshot.definition;
    const variant = { definition, variant: createVariant(definition) };
    await sql`update practice_game.drill_attempts set private_variant=${sql.json(variant)},variant_revision=variant_revision+1,active_elapsed_ms=0,active_since=null,started_at=${row.ordinal === round.active_ordinal ? now : null} where user_id=${userId} and id=${row.id} and answer is null and submitted_at is null`;
  }
  await sql`update practice_game.play_sessions set last_activity_at=${now} where user_id=${userId} and id=${round.id}`;
  return rows.length > 0;
}
