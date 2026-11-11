import "server-only";
import type { DrillDefinition } from "./definition";
/** The author-supplied bank is installed in the content step. Empty content fails closed. */
const drills: DrillDefinition[] = [];
export const drillsForTopic = (topic: string) =>
  drills.filter((drill) => drill.topic === topic);
