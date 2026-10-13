import { describe, expect, it } from "vitest";
import {
  hasCandidateAnswer,
  isMeaningfulFinding,
} from "@/lib/grading-evidence";

describe("grading evidence sufficiency", () => {
  it.each([
    "Okay",
    "Hello",
    "Done",
    "Please let me finish",
    "I'm ready to explain my design. Please let me finish before asking questions.",
  ])("does not grade a greeting or pacing request: %s", (content) => {
    expect(
      hasCandidateAnswer({
        messages: [
          { role: "assistant", content: "An elaborate opening" },
          { role: "user", content },
        ],
      }),
    ).toBe(false);
  });
  it("keeps real design content even when sent with a pacing action", () => {
    expect(
      hasCandidateAnswer({
        messages: [
          {
            role: "user",
            content: "Requests reach the application and then the database.",
            action: "explain",
          },
        ],
      }),
    ).toBe(true);
  });
  it("rejects label-only gaps and accepts specific useful feedback", () => {
    expect(isMeaningfulFinding("In your final diagram: Clients")).toBe(false);
    expect(isMeaningfulFinding("Clients")).toBe(false);
    expect(
      isMeaningfulFinding(
        "App 2 has no shown data path; explain how its reads and writes reach the database.",
      ),
    ).toBe(true);
  });
});
