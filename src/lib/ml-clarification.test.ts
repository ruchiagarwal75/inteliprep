import { beforeEach, describe, expect, it, vi } from "vitest";
import { streamInterviewerReply } from "./llm";
import { getProblem } from "./problems";
import { genaiEstimateVerdict } from "./genai-estimation";
const model = vi.hoisted(() => vi.fn());
vi.mock("@/lib/observed-model-request", () => ({
  observedModelRequest: model,
}));
beforeEach(() => model.mockReset());
const examples = [
  {
    id: "video-recommendations",
    message: "Tell me the daily audience and how often they open the feed.",
    ids: ["dau", "feed-requests"],
    expected: ["100M daily active users.", "5 feed requests per user per day"],
    hidden: "50M videos",
    wrong:
      "I estimate 500M feed requests a day is 500K feed requests per second.",
  },
  {
    id: "ad-click-prediction",
    message: "Tell me the daily audience and requests per user.",
    ids: ["dau", "ad-requests"],
    expected: ["300M daily active users.", "10 ad requests per user per day"],
    hidden: "500 candidate ads",
    wrong:
      "I estimate 3B ad requests a day means 3M predictions per second for 500 candidates.",
  },
];
describe.each(examples)("ML clarification: $id", (example) => {
  const problem = getProblem(example.id);
  if (!problem) throw Error("Missing ML problem");
  it("answers all and only the fact IDs selected by the stub classifier", async () => {
    model.mockResolvedValueOnce({
      status: "completed",
      output_text: JSON.stringify({
        intent: "facts",
        factIds: example.ids,
        hasUnspecified: false,
      }),
    });
    let reply = "";
    for await (const delta of streamInterviewerReply(
      [{ role: "user", content: example.message }],
      "Empty whiteboard.",
      "No changes.",
      undefined,
      undefined,
      {
        problem,
        level: "senior",
        phase: problem.phases[0],
        mayInviteDrawing: false,
        progress: {
          step: "discussion",
          candidateTurns: 1,
          discussionTurnLimit: 99,
        },
      },
    ))
      reply += delta;
    for (const text of example.expected) expect(reply).toContain(text);
    expect(reply).not.toContain(example.hidden);
    expect(reply).not.toMatch(/5,800|17K|8\.7M|51 GB|52M/u);
    expect(model).toHaveBeenCalledTimes(1);
    expect(model.mock.lastCall?.[1].text.format.name).toBe(
      "genai_fact_selection",
    );
  });
  it("uses the private arithmetic check with candidate evidence for a Senior redo", async () => {
    model.mockResolvedValueOnce({
      status: "completed",
      output_text: JSON.stringify({
        verdict: "redo",
        evidenceQuote: example.wrong,
      }),
    });
    expect(
      await genaiEstimateVerdict([{ role: "user", content: example.wrong }], {
        problem,
        level: "senior",
      }),
    ).toBe("redo");
    expect(model).toHaveBeenCalledTimes(1);
    expect(model.mock.lastCall?.[1].text.format.name).toBe(
      "genai_estimate_check",
    );
  });
});
