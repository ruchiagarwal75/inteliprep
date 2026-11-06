import { expect, it } from "vitest";
import { sceneSchema } from "@/lib/scene";
import { buildInterviewerInput } from "@/lib/interviewer-input";
import { sceneToText } from "@/lib/scene-to-text";
import {
  addedComponentQuestion,
  diagramConsistencyQuestion,
  whiteboardVisibilityReply,
} from "@/lib/diagram-consistency";
import { diagramReviewQuestion } from "@/lib/diagram-review";
import { withDiagramConsistency } from "@/lib/scorecard-diagram";
import { scorecardFixture } from "@/lib/fixtures/scorecard-test";
import { hasAsk, hasExplanation, questionAtEnd } from "@/lib/open-question";
import type { ChatMessage } from "@/lib/chat";
const labels = [
  "Client",
  "API service",
  "Redis cache",
  "Cassandra DB",
  "ZooKeeper",
];
const scene = sceneSchema.parse({
  elements: labels.flatMap((text, i) => [
    {
      id: `n${i}`,
      type: "rectangle",
      x: i * 200,
      y: 0,
      width: 100,
      height: 80,
    },
    {
      id: `t${i}`,
      type: "text",
      containerId: `n${i}`,
      text,
      x: i * 200 + 10,
      y: 20,
      width: 80,
      height: 20,
    },
  ]),
});
const messages: ChatMessage[] = [
  {
    role: "user",
    content: "I use PostgreSQL and a load balancer to distribute requests.",
  },
];
it("sends the real labeled whiteboard payload and identifies spoken/drawn mismatches once", () => {
  const payload = buildInterviewerInput(
    messages,
    sceneToText(scene),
    "Added: ZooKeeper",
  );
  expect(JSON.stringify(payload)).toContain("Candidate’s current whiteboard");
  for (const label of labels) expect(JSON.stringify(payload)).toContain(label);
  const question = diagramConsistencyQuestion(scene, messages);
  expect(question).toContain("Cassandra DB");
  expect(question).toContain("PostgreSQL");
  expect(
    diagramConsistencyQuestion(scene, [
      ...messages,
      { role: "assistant", content: question ?? "" },
    ]),
  ).toBeUndefined();
  expect(diagramReviewQuestion(scene, messages)).toContain("load balancer");
  expect(
    diagramConsistencyQuestion(scene, [
      ...messages,
      { role: "user", content: "Cassandra is intended, not PostgreSQL." },
    ]),
  ).toBeUndefined();
  expect(
    addedComponentQuestion(
      scene,
      { elements: scene.elements.filter((e) => !["n4", "t4"].includes(e.id)) },
      messages,
    ),
  ).toContain("ZooKeeper");
  expect(
    whiteboardVisibilityReply(scene, "Can you see my whiteboard?"),
  ).toContain("ZooKeeper");
  expect(
    withDiagramConsistency(scorecardFixture(), { scene, messages })
      .diagramConsistency?.[0].text,
  ).toContain("PostgreSQL");
});
it("requires an explanation and detects actionable endings and persistent questions", () => {
  const start: ChatMessage = {
    role: "user",
    content: "Ready",
    action: "explain",
    source: "control",
  };
  expect(hasExplanation([start])).toBe(false);
  expect(hasExplanation([start, messages[0]])).toBe(true);
  expect(
    questionAtEnd("A short acknowledgement. What happens if ZooKeeper fails?"),
  ).toBe("What happens if ZooKeeper fails?");
  expect(hasAsk("Thanks for explaining.")).toBe(false);
  expect(hasAsk("Atomic updates help keep the counters consistent.")).toBe(
    false,
  );
  expect(hasAsk("You could draw a cache here.")).toBe(false);
  expect(hasAsk("Please walk through your design.")).toBe(true);
});
