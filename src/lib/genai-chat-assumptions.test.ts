import { describe, expect, it } from "vitest";
import { getProblem } from "@/lib/problems";
import { genaiAssumptionReply, genaiFact } from "@/lib/genai-facts";
import { estimationAsk } from "@/lib/clarification-continuation";
const problem = getProblem("ai-chat-assistant");
if (!problem) throw new Error("Missing chat assistant");
describe("chat-assistant candidate assumptions", () => {
  it.each(["mid", "senior", "staff"] as const)(
    "asks for the %s candidate's own size assumption",
    (level) => {
      const reply = genaiAssumptionReply(problem, level, [
        { role: "user", content: "How big is each stored message?" },
      ]);
      expect(reply).toBe(
        "What would you assume for stored message size, given the token counts?",
      );
      expect(reply).not.toMatch(/2\s*KB/iu);
    },
  );
  it("offers Mid help only after an attempted assumption, never at higher levels", () => {
    const messages = [
      { role: "user" as const, content: "How big is each stored message?" },
      {
        role: "assistant" as const,
        content:
          "What would you assume for stored message size, given the token counts?",
      },
      {
        role: "user" as const,
        content:
          "I tried assuming 100 bytes per message, but I am stuck and need help.",
      },
      { role: "user" as const, content: "I am still stuck." },
    ];
    expect(genaiAssumptionReply(problem, "mid", messages)).toContain(
      "about 2 KB",
    );
    expect(genaiAssumptionReply(problem, "senior", messages)).not.toContain(
      "2 KB",
    );
    expect(genaiAssumptionReply(problem, "staff", messages)).not.toContain(
      "2 KB",
    );
  });
  it("routes derived GPU requirements to estimation, not the raw available-capacity fact", () => {
    const content = "How many GPUs do I need?";
    expect(problem.genai?.facts.map((f) => f.id)).not.toContain(
      "required-gpu-count",
    );
    expect(
      estimationAsk([{ role: "user", content }], "senior", "genai"),
    ).toMatch(/estimate/iu);
    expect(genaiFact(problem, "staff", ["gpu-capacity"])?.text).toContain(
      "6,000",
    );
  });
});
