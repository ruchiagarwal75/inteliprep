import { expect, it } from "vitest";
import { auditDiagram } from "@/lib/diagram-audit";
import { sceneSchema } from "@/lib/scene";
import { withDiagramConsistency } from "@/lib/scorecard-diagram";
import { scorecardFixture } from "@/lib/fixtures/scorecard-test";
const scene = sceneSchema.parse({
  elements: [
    { id: "db", type: "rectangle", x: 0, y: 0, width: 200, height: 100 },
    {
      id: "label",
      type: "text",
      containerId: "db",
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      text: "Cassandra DB",
    },
  ],
});
it("keeps a historical database conflict and a missing load balancer, marking a later correction", () => {
  const snapshot = {
    scene,
    messages: [
      {
        role: "user" as const,
        content:
          "The API writes to PostgreSQL. I use a load balancer in front of the API.",
      },
      {
        role: "assistant" as const,
        content: "Your board shows Cassandra DB. Which is intended?",
      },
      { role: "user" as const, content: "I meant Cassandra, not PostgreSQL." },
    ],
  };
  const findings = auditDiagram(snapshot);
  expect(findings.find((f) => f.kind === "technology")).toMatchObject({
    resolved: true,
    text: expect.stringContaining("PostgreSQL"),
  });
  expect(findings.find((f) => f.kind === "missing_component")).toMatchObject({
    resolved: false,
    text: expect.stringContaining("Load balancer"),
  });
  const card = withDiagramConsistency(scorecardFixture(), snapshot);
  expect(card.diagramConsistency).toHaveLength(2);
  expect(card.areas.every((a) => a.diagramNote === undefined)).toBe(true);
});
it("does not treat questions or rejected alternatives as design choices", () => {
  expect(
    auditDiagram({
      scene,
      messages: [
        { role: "user", content: "Could I use PostgreSQL?" },
        {
          role: "user",
          content: "I use Cassandra, not PostgreSQL, without a load balancer.",
        },
      ],
    }),
  ).toEqual([]);
});
