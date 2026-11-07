import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatMessage } from "@/lib/chat";
import {
  assessPhaseCoverage,
  coveredPhaseCriteria,
  evidenceMessages,
} from "@/lib/phase-assessment";
import { getProblem } from "@/lib/problems";
import { candidateQuotes } from "@/lib/scorecard-quotes";

const mocks = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("openai", async (original) => ({
  ...(await original<typeof import("openai")>()),
  default: class {
    responses = { create: mocks.create };
  },
}));
const phase = getProblem("single-server-scaling")?.phases[2];
if (!phase) throw new Error("Missing phase");
const excerpts = [
  "A larger server reduces CPU pressure.",
  "Requests and data stay on that machine, but it costs more.",
];
const history: ChatMessage[] = [
  { role: "assistant", content: excerpts.join(" ") },
  { role: "user", content: "Hi. Okay, thanks!" },
  {
    role: "user",
    content: excerpts.join(" "),
    action: "review",
    source: "control",
  },
  {
    role: "user",
    content: `${excerpts[0]} Please let me finish. ${excerpts[1]}`,
    action: "explain",
  },
];
const criteria = excerpts.map((quote, criterionIndex) => ({
  criterionIndex,
  met: true,
  messageIndex: 3,
  quote,
}));
beforeEach(() => {
  mocks.create.mockReset();
  vi.stubEnv("OPENAI_KEY", "test-key");
});
afterEach(() => vi.unstubAllEnvs());

describe("shared stage and scoring evidence eligibility", () => {
  it("uses the same eligible excerpts and preserves original message references", () => {
    expect(evidenceMessages(history)).toEqual([{ index: 3, excerpts }]);
    expect(candidateQuotes(history)).toEqual(
      excerpts.map((quote, index) => ({
        quoteId: `m3q${index}`,
        messageIndex: 3,
        quote,
      })),
    );
    expect(coveredPhaseCriteria(phase, history, { criteria })).toEqual([0, 1]);
  });
  it.each([
    { messageIndex: 0, quote: excerpts[0] },
    { messageIndex: 1, quote: "Okay, thanks!" },
    { messageIndex: 2, quote: excerpts[0] },
    { messageIndex: 3, quote: "Please let me finish." },
    { messageIndex: 3, quote: excerpts.join(" ") },
    { messageIndex: 3, quote: `${excerpts[0]} Please let me finish.` },
  ])("rejects ineligible or combined stage quotes: %j", (evidence) => {
    expect(
      coveredPhaseCriteria(phase, history, {
        criteria: [{ ...criteria[0], ...evidence }, criteria[1]],
      }),
    ).toEqual([]);
  });
  it("rejects a pacing-only quote even inside a sentence containing real reasoning", () => {
    const messages: ChatMessage[] = [
      {
        role: "user",
        content: "Please let me finish; a larger server reduces CPU pressure.",
      },
    ];
    expect(evidenceMessages(messages)).toHaveLength(1);
    expect(
      coveredPhaseCriteria(phase, messages, {
        criteria: [
          { ...criteria[0], messageIndex: 0, quote: "Please let me finish" },
          { ...criteria[1], met: false, messageIndex: -1, quote: "" },
        ],
      }),
    ).toEqual([]);
  });
  it("does not let controls displace the last 12 eligible messages", () => {
    const messages: ChatMessage[] = Array.from({ length: 20 }, () => ({
      role: "user",
      content: excerpts[0],
    }));
    messages.push(
      ...Array.from({ length: 20 }, (): ChatMessage => ({
        role: "user",
        content: "I've finished explaining. Let's discuss my design.",
        source: "control",
      })),
    );
    const evidence = evidenceMessages(messages);
    expect(evidence.map((item) => item.index)).toEqual(
      Array.from({ length: 12 }, (_, index) => index + 8),
    );
    expect(evidence.every((item) => item.excerpts[0] === excerpts[0])).toBe(
      true,
    );
  });
  it("cannot cite words outside the bounded evidence supplied to the model", () => {
    const messages: ChatMessage[] = [
      { role: "user", content: `${"x".repeat(2_000)} ${excerpts[0]}` },
    ];
    expect(
      coveredPhaseCriteria(phase, messages, {
        criteria: criteria.map((criterion) => ({
          ...criterion,
          messageIndex: 0,
        })),
      }),
    ).toEqual([]);
  });
  it("sends filtered excerpts and rejects the provider citing excluded text", async () => {
    mocks.create.mockResolvedValue({
      status: "completed",
      output_text: JSON.stringify({
        criteria: [
          { ...criteria[0], quote: "Please let me finish." },
          criteria[1],
        ],
      }),
    });
    expect(await assessPhaseCoverage(phase, history)).toEqual([]);
    const input = JSON.parse(mocks.create.mock.calls[0][0].input);
    expect(input.candidate_messages).toEqual([{ index: 3, excerpts }]);
  });
  it("skips the provider when only interviewer text, greetings, and controls remain", async () => {
    const messages = history.slice(0, 3);
    vi.stubEnv("OPENAI_KEY", "");
    expect(candidateQuotes(messages)).toEqual([]);
    expect(await assessPhaseCoverage(phase, messages)).toEqual([]);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
