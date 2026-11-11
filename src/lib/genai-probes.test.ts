import { expect, it } from "vitest";
import {
  focusGenaiProbes,
  questionMatchesGenaiTopic,
} from "@/lib/genai-probes";
const probes = [
  {
    id: "mmq7-quality",
    topicPattern: "eval|quality",
    question: "How would you evaluate the change?",
  },
  {
    id: "mmq7-moderation",
    topicPattern: "moderat|safety",
    question: "How does moderation affect latency?",
  },
];
it("constrains a requested GenAI topic to its applicable bank", () => {
  expect(
    focusGenaiProbes("genai", probes, "Let's examine evaluation."),
  ).toEqual([probes[0]]);
  expect(
    focusGenaiProbes("genai", probes, "Let's examine moderation."),
  ).toEqual([probes[1]]);
});
it("does not change core selection or invent a bank for an unmatched topic", () => {
  expect(focusGenaiProbes("core", probes, "evaluation")).toBe(probes);
  expect(focusGenaiProbes("genai", probes, "storage")).toBe(probes);
});
it("rejects a retry question mislabeled as a GenAI moderation probe", () => {
  expect(
    questionMatchesGenaiTopic(
      "genai",
      probes[1],
      "What happens when the queue redelivers a request?",
    ),
  ).toBe(false);
  expect(
    questionMatchesGenaiTopic(
      "genai",
      probes[1],
      "What does moderation add to first-token latency?",
    ),
  ).toBe(true);
  expect(questionMatchesGenaiTopic("genai", undefined, "Anything?")).toBe(
    false,
  );
  expect(
    questionMatchesGenaiTopic(
      "core",
      probes[1],
      "What happens when the queue redelivers a request?",
    ),
  ).toBe(true);
});
