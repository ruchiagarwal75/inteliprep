import { expect, it } from "vitest";
import fixtures from "../../tests/fixtures/genai-buzzwords-v2.json";
import { getProblem } from "@/lib/problems";
import { chatMessageSchema } from "@/lib/chat";
import { fixtureScene } from "../../tests/live/genai-fixture";
import { sceneToGraph } from "@/lib/scene-graph";
for (const fixture of fixtures)
  it(`keeps an assessable confident buzzword-only Senior case for ${fixture.problemId}`, () => {
    const problem = getProblem(fixture.problemId);
    expect(problem?.track).toBe("genai");
    expect(problem?.rubric).toHaveLength(7);
    expect(fixture.messages).toHaveLength(14);
    for (const message of fixture.messages)
      expect(chatMessageSchema.safeParse(message).success).toBe(true);
    const graph = sceneToGraph(fixtureScene(fixture.nodes, fixture.edges));
    expect(graph.components).toHaveLength(fixture.nodes.length);
    expect(graph.connections).toHaveLength(fixture.edges.length);
    expect(
      fixture.messages.filter((m) => m.role === "assistant").at(-1)?.content,
    ).toMatch(/revocation|ownership|approval/iu);
  });

it("keeps confident candidate answers free of giveaway phrases, numbers and thresholds", () => {
  expect(fixtures).toHaveLength(3);
  for (const fixture of fixtures) {
    const answers = fixture.messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(" ");
    expect(answers).not.toMatch(/look good|defaults|best practices|\d/iu);
    expect(answers).toMatch(/golden set/iu);
    expect(answers).toMatch(/LLM.as.judge/iu);
  }
});
