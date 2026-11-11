import { genaiGeneralInvitation } from "@/lib/genai-clarification-pace";
import { expect, it, vi } from "vitest";
import type { ChatMessage } from "@/lib/chat";
import {
  genaiFactFollowUp,
  genaiAssumptionInvitation,
} from "@/lib/genai-clarification-pace";
import { streamInterviewerReply } from "@/lib/llm";
import { genaiEngineFixture } from "@/lib/fixtures/genai-engine-test";
const model = vi.hoisted(() => vi.fn());
vi.mock("@/lib/observed-model-request", () => ({
  observedModelRequest: model,
}));
const turns = (n: number): ChatMessage[] =>
  Array.from({ length: n }, () => ({
    role: "user",
    content: "How many employees?",
  }));
it("leaves the first two facts quiet and varies every-third-turn prompts", () => {
  expect(genaiFactFollowUp(turns(1), "20,000 employees.")).toBeUndefined();
  expect(genaiFactFollowUp(turns(2), "20,000 employees.")).toBeUndefined();
  expect(genaiFactFollowUp(turns(4), "20,000 employees.")).toBeUndefined();
  expect(
    new Set(
      [3, 6, 9].map((n) => genaiFactFollowUp(turns(n), "20,000 employees.")),
    ).size,
  ).toBe(3);
});
it("does not add a prompt after an existing assumption invitation or a drawing control", () => {
  expect(genaiFactFollowUp(turns(3), "What would you assume?")).toBeUndefined();
  expect(
    genaiFactFollowUp(
      [
        ...turns(2),
        { role: "user", source: "control", action: "draw", content: "Draw" },
      ],
      "20,000 employees.",
    ),
  ).toBeUndefined();
});
it("keeps consecutive unknown answers actionable without naming a topic", () => {
  const prompt = genaiAssumptionInvitation([
    {
      role: "assistant",
      content: "That detail isn't specified. What would you assume?",
    },
  ]);
  expect(prompt).toBe("Which working assumption would you use?");
  expect(prompt).not.toMatch(/traffic|safety|permission|latency/iu);
});
it("does not let the general ending guard append a missing-topic question to a fact", async () => {
  model.mockResolvedValue({
    status: "completed",
    output_text: JSON.stringify({
      intent: "facts",
      factIds: ["mmq7-employees"],
      hasUnspecified: false,
    }),
  });
  const problem = genaiEngineFixture();
  let reply = "";
  for await (const delta of streamInterviewerReply(
    turns(1),
    "Empty board.",
    "",
    undefined,
    undefined,
    {
      problem,
      level: "senior",
      phase: problem.phases[0],
      progress: {
        step: "discussion",
        candidateTurns: 1,
        discussionTurnLimit: 99,
      },
    },
  ))
    reply += delta;
  expect(reply).toBe("There are 20,000 employees.");
});

it("keeps general invitations actionable, varied and topic-free", () => {
  const first = genaiGeneralInvitation([]);
  const second = genaiGeneralInvitation([
    { role: "assistant", content: first },
  ]);
  expect(first).not.toBe(second);
  expect(first + second).not.toMatch(
    /specified|traffic|latency|tokens|permissions|database/iu,
  );
});
