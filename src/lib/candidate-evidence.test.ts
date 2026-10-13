import { describe, expect, it } from "vitest";
import {
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
  });
});
