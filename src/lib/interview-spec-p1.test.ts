import { expect, it } from "vitest";
import { draftJournal } from "@/lib/draft-journal";
import { withSessionContext } from "@/lib/scorecard-calibration";
import {
  scorecardFixture,
  endedAtFixture,
} from "@/lib/fixtures/scorecard-test";
import { createInterviewTiming } from "@/lib/interview-timer";
import { initialInterviewId, interviewHref } from "@/lib/interview-navigation";
import { sceneToGraph } from "@/lib/scene-graph";
import { captureScene } from "@/lib/scene-snapshot";
import { hasLabeledShape } from "@/lib/labeled-drawing";
import { whiteboardFixture } from "@/lib/fixtures/whiteboard-test";
it("recovers the complete last draft even when IndexedDB was one debounce behind", () => {
  const map = new Map<string, string>();
  const store = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
  const draft = "Draft text that I have not sent yet";
  draftJournal(store, "user:session:tab1").write(draft);
  expect(
    draftJournal(store, "user:session:tab1").read("Draft text that I have no"),
  ).toBe(draft);
  expect(draftJournal(store, "other-user:session:tab1").read("")).toBe("");
  expect(draftJournal(store, "user:session:tab2").read("")).toBe("");
  draftJournal(store, "user:session:tab1").write("");
  expect(draftJournal(store, "user:session:tab1").read(draft)).toBe("");
});
it("hides six-minute scores and scores with fewer than two answered stages, preserving exact evidence", () => {
  const card = scorecardFixture();
  const at = Date.parse(endedAtFixture);
  for (const [minutes, stages, limited] of [
    [6, 3, true],
    [20, 1, true],
    [20, 2, false],
  ] as const) {
    const result = withSessionContext(
      card,
      createInterviewTiming(45, at - minutes * 60_000),
      stages,
    );
    expect(result.session?.limited).toBe(limited);
    expect(result.areas.every((area) => area.score === null)).toBe(limited);
    expect(result.areas[0].evidence).toEqual(card.areas[0].evidence);
  }
});
it("never resumes history implicitly, preserves old query links, and requires a labeled component", () => {
  const id = crypto.randomUUID();
  expect(initialInterviewId("", [{ id }])).toBeUndefined();
  expect(initialInterviewId(`?session=${id}`, [])).toBe(id);
  expect(interviewHref(id)).toBe(`/interview/${id}`);
  const board = whiteboardFixture();
  expect(
    sceneToGraph(captureScene(board.elements)).components.length,
  ).toBeGreaterThan(0);
  expect(hasLabeledShape(board.elements.filter((e) => e.type !== "text"))).toBe(
    false,
  );
});

it("keeps large native browser saves readable even when they exceed model request limits", () => {
  const board = whiteboardFixture();
  const large = Array.from({ length: 600 }, (_, index) => ({
    ...board.elements[0],
    id: `legacy-${index}`,
  }));
  expect(() => hasLabeledShape(large)).not.toThrow();
});
