import { describe, expect, it } from "vitest";
import { areaWasExplored } from "@/lib/grading-opportunity";
import { getProblem } from "@/lib/problems";
import { PNG_FIXTURE } from "@/lib/fixtures/whiteboard-test";
import type { InterviewEndSnapshot } from "@/lib/interview-end";

const selected = getProblem("url-shortener");
if (!selected) throw new Error("Missing problem");
const problem = selected;
const snapshot: InterviewEndSnapshot = {
  messages: [
    {
      role: "assistant",
      content:
        "Design a reliable URL shortener with tradeoffs. What requirements would you clarify?",
    },
    {
      role: "user",
      content:
        "Each submitted URL gets a short identifier. Store it with the URL in a database and look it up during redirect.",
    },
    {
      role: "user",
      content: "I've finished explaining. Let's discuss my design.",
      source: "control",
      action: "review",
    },
  ],
};

describe("rubric assessment opportunities", () => {
  it.each([
    "50k-follower",
    "50,000-follower",
    "50,000 followers",
    "5 million followers",
  ])("recognizes candidate reasoning about %s creators", (count) => {
    const feed = getProblem("news-feed");
    if (!feed) throw new Error("Missing news feed");
    expect(
      areaWasExplored(feed, 3, {
        messages: [
          { role: "assistant", content: feed.levels.mid.openingMessage },
        ],
      }),
    ).toBe(false);
    expect(
      areaWasExplored(feed, 3, {
        messages: [
          {
            role: "user",
            content: `For the ${count} case, I would read their recent posts separately to avoid writing one entry per recipient.`,
          },
        ],
      }),
    ).toBe(true);
  });
  it("does not turn a core redirect explanation into evidence of unasked scaling or operations", () => {
    expect(areaWasExplored(problem, 1, snapshot)).toBe(true);
    expect(areaWasExplored(problem, 2, snapshot)).toBe(true);
    expect(areaWasExplored(problem, 3, snapshot)).toBe(false);
    expect(areaWasExplored(problem, 4, snapshot)).toBe(false);
  });
  it("accepts volunteered reasoning and actual focused questions, including an unanswered question", () => {
    expect(
      areaWasExplored(problem, 3, {
        messages: [
          ...snapshot.messages,
          {
            role: "user",
            content:
              "Cache popular links to serve more traffic, accepting invalidation complexity.",
          },
        ],
      }),
    ).toBe(true);
    expect(
      areaWasExplored(problem, 4, {
        messages: [
          ...snapshot.messages,
          {
            role: "assistant",
            content: "What is the operational cost of that choice?",
          },
          { role: "user", content: "I don't know." },
        ],
      }),
    ).toBe(true);
  });
  it("does not count topics mentioned in factual answers as questions actually asked", () => {
    expect(
      areaWasExplored(problem, 4, {
        messages: [
          ...snapshot.messages,
          {
            role: "assistant",
            content: "Analytics is optional. How do you store the URL mapping?",
          },
        ],
      }),
    ).toBe(false);
  });
  it("preserves volunteered diagram topics and uncertainty about attached freehand content", () => {
    const text = {
      id: "note",
      type: "text" as const,
      text: "Add rate limiting to prevent abuse",
      containerId: null,
      x: 0,
      y: 0,
      width: 100,
      height: 40,
      angle: 0,
      isDeleted: false,
      frameId: null,
      groupIds: [],
    };
    expect(
      areaWasExplored(problem, 4, { ...snapshot, scene: { elements: [text] } }),
    ).toBe(true);
    const drawing = { ...text, type: "freedraw" as const };
    expect(
      areaWasExplored(problem, 4, {
        ...snapshot,
        scene: { elements: [drawing] },
      }),
    ).toBe(false);
    expect(
      areaWasExplored(problem, 4, {
        ...snapshot,
        diagramImage: PNG_FIXTURE,
        scene: { elements: [drawing] },
      }),
    ).toBe(true);
  });
});
