import "server-only";
import type { DrillDefinition } from "./definition";
import type { DrillAnswer } from "./public";
export function needsAiGrade(drill: DrillDefinition, answer: DrillAnswer) {
  if (drill.type !== "pick_probe" && drill.type !== "tradeoff") return false;
  const text =
    answer.type === "pick_probe"
      ? answer.text
      : answer.type === "tradeoff"
        ? answer.decision + " " + answer.reason
        : "";
  return text.trim().split(/\s+/u).length >= 4;
}
