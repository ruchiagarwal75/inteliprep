import { describe, expect, it } from "vitest";
import {
  candidateEvidenceExcerpts,
  isCandidateEvidence,
  isPacingOnlyText,
} from "@/lib/candidate-evidence";

describe("technical candidate evidence versus interview controls", () => {
  it.each([
    "Hello",
    "Okay, thanks!",
    "I've finished explaining.",
    "Let’s discuss my design.",
    "Please let me finish before asking questions.",
    "I'm not done explaining.",
  ])("excludes pacing-only text: %s", (content) => {
    expect(isPacingOnlyText(content)).toBe(true);
    expect(isCandidateEvidence({ role: "user", content })).toBe(false);
  });
  it("keeps technical answers sent with an explicit or inferred pacing action", () => {
    const content =
      "Please let me finish. Each app server reads and writes the shared database.";
    expect(
      isCandidateEvidence({ role: "user", content, action: "explain" }),
    ).toBe(true);
    expect(isPacingOnlyText(content)).toBe(false);
  });
  it("never credits interviewer facts or generated button messages", () => {
    const content = "Requests use a shared database.";
    expect(isCandidateEvidence({ role: "assistant", content })).toBe(false);
    expect(
      isCandidateEvidence({ role: "user", content, source: "control" }),
    ).toBe(false);
    expect(candidateEvidenceExcerpts({ role: "assistant", content })).toEqual(
      [],
    );
    expect(
      candidateEvidenceExcerpts({ role: "user", content, source: "control" }),
    ).toEqual([]);
  });
  it.each(["draw", "explain", "review"] as const)(
    "keeps exact technical excerpts alongside the %s action",
    (action) => {
      const content =
        "Hi! Please let me finish. Target 0.5 seconds at example.com.\nBoth apps\nuse the database. I've finished explaining.";
      const message = { role: "user" as const, content, action };
      const excerpts = candidateEvidenceExcerpts(message);
      expect(excerpts).toEqual([
        "Target 0.5 seconds at example.com.",
        "Both apps\nuse the database.",
      ]);
      expect(excerpts.every((excerpt) => content.includes(excerpt))).toBe(true);
      expect(isCandidateEvidence(message)).toBe(true);
    },
  );
  it.each(["", "  \n ", "Hello. Okay, thanks! I've finished explaining."])(
    "finds no evidence in blank or control-only messages: %s",
    (content) => {
      const message = { role: "user" as const, content };
      expect(candidateEvidenceExcerpts(message)).toEqual([]);
      expect(isCandidateEvidence(message)).toBe(false);
    },
  );
  it("keeps a specific requirements confirmation eligible", () => {
    const content = "I confirm those traffic and response-time targets.";
    expect(candidateEvidenceExcerpts({ role: "user", content })).toEqual([
      content,
    ]);
  });
});
