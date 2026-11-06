import { describe, expect, it } from "vitest";
import { getProblem } from "@/lib/problems";
import {
  configuredClarification,
  sharedRequirementCriteria,
} from "@/lib/configured-clarifications";
import { interviewLevelSchema } from "@/lib/interview-selection";

describe("additional practice exercise guarantees", () => {
  it.each(interviewLevelSchema.options)(
    "separates notification acceptance, provider outcomes, and retry limits at %s",
    (level) => {
      const problem = getProblem("notification-system");
      if (!problem) throw new Error("Missing notification problem");
      const answer = configuredClarification(
        problem,
        level,
        "What traffic and latency targets should I use, and what do durable acceptance, retries and uncertain provider outcomes guarantee?",
      );
      expect(answer?.text).toContain("200 milliseconds");
      expect(answer?.text).toContain("within 30 seconds");
      expect(answer?.text).toContain("not confirm device delivery or reading");
      expect(answer?.text).not.toContain("current channel preferences");
      expect(answer?.text).toContain("24-hour retry window");
      expect(answer?.text).toContain(
        "exactly-once external delivery is not guaranteed",
      );
      expect(answer?.text).not.toMatch(/\b(?:Yes|No),/u);
    },
  );
  it.each(interviewLevelSchema.options)(
    "distinguishes file publication, conflicts, transfer timing, and access at %s",
    (level) => {
      const problem = getProblem("file-storage");
      if (!problem) throw new Error("Missing file problem");
      const answer = configuredClarification(
        problem,
        level,
        "What file sizes and latency targets should I use, and what do completion, concurrent versions and revoked access guarantee?",
      );
      expect(answer?.text).toContain("1 GB");
      expect(answer?.text).toContain("time to first byte");
      expect(answer?.text).toContain("no fixed whole-file transfer deadline");
      expect(answer?.text).toContain("incomplete uploads stay hidden");
      expect(answer?.text).toContain("must not silently overwrite");
      expect(answer?.text).toContain("within 60 seconds");
      expect(answer?.text).toContain("received bytes cannot be recalled");
    },
  );
  it.each(interviewLevelSchema.options)(
    "separates durable video upload, processing readiness, and playback at %s",
    (level) => {
      const problem = getProblem("video-streaming");
      if (!problem) throw new Error("Missing video problem");
      const answer = configuredClarification(
        problem,
        level,
        "What concurrent viewers, bitrate and readiness timing should I use, and what do upload completion, processing retries and deletion guarantee?",
      );
      expect(answer?.text).toContain("3 Mbps");
      expect(answer?.text).toContain("playback start below 2 seconds");
      expect(answer?.text).toContain("ready within 10 minutes");
      expect(answer?.text).toContain("not playback readiness");
      expect(answer?.text).toContain("incomplete processing hidden");
      expect(answer?.text).toContain(
        "must not create duplicate published videos",
      );
      expect(answer?.text).toContain("buffered bytes cannot be recalled");
    },
  );
  it.each(["notification-system", "file-storage", "video-streaming"])(
    "does not ask %s to repeat guarantees already supplied",
    (id) => {
      const problem = getProblem(id);
      if (!problem) throw new Error("Missing problem");
      const criteria = sharedRequirementCriteria(problem, "mid", [
        { role: "assistant", content: problem.levels.mid.openingMessage },
        { role: "user", content: "What traffic and latency should I assume?" },
      ]);
      expect(criteria.sort()).toEqual([0, 1, 2]);
      expect(problem.phases.map((phase) => phase.transition)).toEqual([
        "initial",
        "drawing",
        "coverage",
        "coverage",
        "wrap-up",
      ]);
    },
  );
});
