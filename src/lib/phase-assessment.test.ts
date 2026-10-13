import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assessPhaseCoverage,
  coveredPhaseCriteria,
  evidenceMessages,
} from "@/lib/phase-assessment";
import { getProblem } from "@/lib/problems";
import type { ChatMessage } from "@/lib/chat";

const mocks = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("openai", () => ({
  default: class {
    responses = { create: mocks.create };
  },
}));
const phase = getProblem("single-server-scaling")?.phases[2];
if (!phase) throw new Error("Missing phase");
const messages: ChatMessage[] = [
  { role: "assistant", content: "A larger server reduces CPU pressure." },
  {
    role: "user",
    content:
      "A larger server reduces CPU pressure. Requests and data stay on that machine, but it costs more.",
  },
  { role: "user", content: "Let's discuss", action: "review" },
];
const criteria = [
  {
    criterionIndex: 0,
    met: true,
    messageIndex: 1,
    quote: "A larger server reduces CPU pressure.",
  },
  {
    criterionIndex: 1,
    met: true,
    messageIndex: 1,
    quote: "Requests and data stay on that machine, but it costs more.",
  },
];
afterEach(() => vi.unstubAllEnvs());

describe("evidence-backed stage assessment", () => {
  it("accepts exact candidate evidence and partial coverage", () => {
    expect(coveredPhaseCriteria(phase, messages, { criteria })).toEqual([0, 1]);
    expect(
      coveredPhaseCriteria(phase, messages, {
        criteria: [
          criteria[0],
          { ...criteria[1], met: false, quote: "", messageIndex: -1 },
        ],
      }),
    ).toEqual([0]);
  });
  it.each([
    { criteria: [criteria[0]] },
    { criteria: [criteria[0], criteria[0]] },
    { criteria: [criteria[0], { ...criteria[1], criterionIndex: 10 }] },
    { criteria: [{ ...criteria[0], messageIndex: 0 }, criteria[1]] },
    { criteria: [{ ...criteria[0], quote: "I added a cache" }, criteria[1]] },
    { criteria: [{ ...criteria[0], quote: "" }, criteria[1]] },
    {
      criteria: [
        { ...criteria[0], messageIndex: 999, quote: "Let's discuss" },
        criteria[1],
      ],
    },
  ])("rejects malformed or invented evidence %j", (assessment) => {
    expect(coveredPhaseCriteria(phase, messages, assessment)).toEqual([]);
  });
  it("limits evidence context and keeps original message indices", () => {
    const history: ChatMessage[] = Array.from({ length: 20 }, () => ({
      role: "user",
      content: "x".repeat(8_000),
    }));
    const evidence = evidenceMessages(history);
    expect(evidence).toHaveLength(12);
    expect(evidence[0]).toEqual({ index: 8, content: "x".repeat(2_000) });
  });
  it("uses strict structured output and validates evidence before returning coverage", async () => {
    vi.stubEnv("OPENAI_KEY", "test-key");
    vi.stubEnv("OPENAI_MODEL", "test-model");
    mocks.create.mockResolvedValue({
      status: "completed",
      output_text: JSON.stringify({ criteria }),
    });
    const signal = new AbortController().signal;
    expect(await assessPhaseCoverage(phase, messages, signal)).toEqual([0, 1]);
    const [request, options] = mocks.create.mock.calls.at(-1) ?? [];
    expect(request.text.format).toMatchObject({
      type: "json_schema",
      strict: true,
      name: "stage_coverage",
    });
    expect(request.model).toBe("test-model");
    expect(request.instructions).toContain("untrusted evidence");
    expect(options.signal).toBe(signal);
    mocks.create.mockResolvedValue({ status: "incomplete" });
    await expect(assessPhaseCoverage(phase, messages)).rejects.toThrow(
      "did not complete",
    );
  });
  it("includes technical explanations that also carry a pacing action", () => {
    const explanation: ChatMessage[] = [{ ...messages[1], action: "explain" }];
    expect(evidenceMessages(explanation)).toEqual([
      { index: 0, content: messages[1].content },
    ]);
    expect(
      coveredPhaseCriteria(phase, explanation, {
        criteria: criteria.map((criterion) => ({
          ...criterion,
          messageIndex: 0,
        })),
      }),
    ).toEqual([0, 1]);
  });
  it("resolves a clear requirements confirmation using bounded conversation context, with candidate-only evidence", async () => {
    const initial = getProblem("single-server-scaling")?.phases[0];
    if (!initial) throw new Error("Missing initial stage");
    vi.stubEnv("OPENAI_KEY", "test-key");
    const confirmation: ChatMessage[] = [
      {
        role: "assistant",
        content:
          "The app and data start on one server. Traffic grows to 1,000 requests/sec, responses under 500 ms, and data must stay available.",
      },
      {
        role: "user",
        content:
          "I confirm that starting scope, traffic and response-time goals, and preserving existing data.",
      },
    ];
    const result = {
      criteria: initial.completionCriteria.map((_, criterionIndex) => ({
        criterionIndex,
        met: true,
        messageIndex: 1,
        quote: confirmation[1].content,
      })),
    };
    mocks.create.mockResolvedValue({
      status: "completed",
      output_text: JSON.stringify(result),
    });
    expect(await assessPhaseCoverage(initial, confirmation)).toEqual([0, 1, 2]);
    const request = mocks.create.mock.calls.at(-1)?.[0];
    const input = JSON.parse(request.input);
    expect(input.stage_kind).toBe("initial");
    expect(input.conversation_context).toEqual(
      confirmation.map((message, index) => ({ ...message, index })),
    );
    expect(request.instructions).toContain(
      "A question alone does not confirm understanding",
    );
    expect(
      coveredPhaseCriteria(initial, confirmation, {
        criteria: result.criteria.map((criterion) => ({
          ...criterion,
          messageIndex: 0,
          quote: confirmation[0].content,
        })),
      }),
    ).toEqual([]);
    const longHistory: ChatMessage[] = Array.from({ length: 40 }, () => ({
      role: "assistant",
      content: "x".repeat(8_000),
    }));
    mocks.create.mockResolvedValue({
      status: "completed",
      output_text: JSON.stringify({
        criteria: initial.completionCriteria.map((_, criterionIndex) => ({
          criterionIndex,
          met: false,
          messageIndex: -1,
          quote: "",
        })),
      }),
    });
    await assessPhaseCoverage(initial, longHistory);
    const bounded = JSON.parse(
      mocks.create.mock.calls.at(-1)?.[0].input,
    ).conversation_context;
    expect(bounded).toHaveLength(24);
    expect(bounded[0]).toEqual({
      index: 16,
      role: "assistant",
      content: "x".repeat(2_000),
    });
  });
});
