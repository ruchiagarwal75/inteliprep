import { expect, it } from "vitest";
import { ragCourse } from "./content";
import { courseDrills } from "./drills";
import { courseQuestionTitle } from "./titles";
import { createVariant, publicQuestion } from "../question";
import { summaryDisplay } from "../summary-store";
import { roundSummarySchema } from "../public";
it("preserves the first 27 supplied question titles in authored order", () => {
  expect(
    ragCourse
      .filter((topic) => topic.level > 0 && topic.level <= 3)
      .flatMap((topic) => topic.questions.map((q) => q.title)),
  ).toEqual([
    "Big chunks",
    "Cut sentences",
    "Split tables",
    "Citation metadata",
    "Chunk count",
    "Stale chunks",
    "Changed chunks",
    "Fast search",
    "Cosine score",
    "Float32 memory",
    "Int8 memory",
    "HNSW vs IVF",
    "Model mismatch",
    "IVF recall",
    "Filter after search",
    "Re-embedding cost",
    "Binary vectors",
    "Error codes",
    "Meaning match",
    "RRF score",
    "Follow-up queries",
    "Multi-query cost",
    "Old pricing",
    "Multi-query latency",
    "Too much context",
    "Count, don't search",
    "Ranked 37th",
  ]);
});
it("relabels saved prompts and review lists without rewriting their snapshots", () => {
  const first = courseDrills.find((drill) => drill.id === "rag-course-t1-q1");
  if (!first) throw Error("Missing original course question");
  const drill = { ...first, title: "T1-Q1" };
  const view = publicQuestion(
    drill,
    createVariant(drill),
    {
      id: crypto.randomUUID(),
      ordinal: 0,
      startedAt: new Date().toISOString(),
    },
    7,
  );
  expect(view.title).toBe("Big chunks");
  expect(drill.title).toBe("T1-Q1");
  const saved = roundSummarySchema.parse({
    mode: "level",
    topic: "rag-course",
    level: 1,
    correct: 6,
    total: 7,
    passed: true,
    passedLevels: [1],
    retryDrills: [{ drillId: "rag-course-t1-q5", title: "T1-Q5", level: 1 }],
    bonusPoints: 0,
    earnedBadges: [],
    practiceReadyNow: false,
  });
  expect(summaryDisplay(saved).retryDrills[0].title).toBe("Chunk count");
  expect(saved.retryDrills[0].title).toBe("T1-Q5");
  expect(courseQuestionTitle("retired", "Existing title")).toBe(
    "Existing title",
  );
  expect(courseQuestionTitle("unknown-course-question", "T8-Q8")).toBe(
    "Practice question",
  );
});
