import { describe, expect, it } from "vitest";
import { configuredClarification } from "@/lib/configured-clarifications";
import { getProblem } from "@/lib/problems";
import { interviewLevelSchema } from "@/lib/interview-selection";
import { areaWasExplored } from "@/lib/grading-opportunity";
import { isRequirementProposal } from "@/lib/candidate-proposal";

describe("reported browser clarification cases", () => {
  it.each(interviewLevelSchema.options)(
    "answers notification parts without repeating its opening at %s",
    (level) => {
      const p = getProblem("notification-system");
      if (!p) throw new Error("Missing problem");
      const question =
        "What peak rate and dispatch time should I use? What is the email vs push split? What does idempotency guarantee?";
      const answer = configuredClarification(p, level, question);
      expect(answer?.complete).toBe(true);
      expect(answer?.text).toContain("30 seconds");
      expect(answer?.text).toContain("60% email-only");
      expect(answer?.text).toContain("caller-scoped idempotency");
      expect(answer?.text).not.toContain(
        p.levels[level].openingMessage.split("\n\n")[2],
      );
      expect(answer?.text).not.toContain("30-day status retention");
      expect(
        areaWasExplored(p, 0, {
          messages: [
            { role: "assistant", content: p.levels[level].openingMessage },
            { role: "user", content: question },
          ],
        }),
      ).toBe(true);
    },
  );
  it("distinguishes concurrent replacement from out-of-scope collaborative editing", () => {
    const p = getProblem("file-storage");
    if (!p) throw new Error("Missing problem");
    const answer = configuredClarification(
      p,
      "mid",
      "What if two devices are editing the same file at once?",
    );
    expect(answer?.text).toContain("stale base version");
    expect(answer?.text).toContain("collaborative document editing");
    expect(
      areaWasExplored(p, 2, {
        messages: [
          {
            role: "user",
            content:
              "I use a compare-and-set check on the base version and return a conflict for the stale device.",
          },
        ],
      }),
    ).toBe(true);
  });
  it("answers video startup and unspecified rebuffering separately", () => {
    const p = getProblem("video-streaming");
    if (!p) throw new Error("Missing problem");
    const answer = configuredClarification(
      p,
      "mid",
      "What concurrent viewers and startup latency should I use? What is the rebuffering target?",
    );
    expect(answer?.complete).toBe(true);
    expect(answer?.text).toContain("below 2 seconds");
    expect(answer?.text).toContain("No numeric rebuffering target is fixed");
  });
  it.each([
    "Keep posts for one year instead of 90 days because users need yearly history.",
    "For retention we can use one year rather than 90 days to support annual reviews.",
    "One year retention supports our audit requirement.",
  ])("makes a justified default alternative visible: %s", (content) => {
    expect(isRequirementProposal(content)).toBe(true);
    const p = getProblem("news-feed");
    if (!p) throw new Error("Missing news feed");
    expect(
      areaWasExplored(p, 0, { messages: [{ role: "user", content }] }),
    ).toBe(true);
  });
});
