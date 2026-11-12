import "server-only";
import type { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
/** Play-only settings. Mock interview and scorecard settings remain independent.
 * https://developers.openai.com/api/docs/models/gpt-6-luna
 */
export const drillModelSettings = {
  model: "gpt-6-luna",
  reasoning: { effort: "none" },
  max_output_tokens: 768,
} satisfies ResponseCreateParamsNonStreaming;
