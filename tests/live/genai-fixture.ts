import { z } from "zod";
import { sceneSchema } from "@/lib/scene";

export const fixtureSchema = z.object({
  problemId: z.string(),
  failureChecks: z.array(z.string()).min(2),
  facts: z.array(z.object({ ask: z.string(), id: z.string() })),
  levels: z.array(z.enum(["mid", "senior", "staff"])),
  wrongEstimates: z.array(
    z.object({ level: z.enum(["mid", "senior", "staff"]), text: z.string() }),
  ),
  weak: z.array(z.string()),
  strong: z.array(z.string()),
  weakNodes: z.array(z.string()),
  strongNodes: z.array(z.string()),
  strongEdges: z.array(z.tuple([z.number(), z.number()])),
  responses: z.array(z.object({ stage: z.number(), text: z.string() })),
});
export type GenaiFixture = z.infer<typeof fixtureSchema>;
export function fixtureScene(labels: string[], edges: number[][] = []) {
  const position = (i: number) => ({
    x: (i % 4) * 220,
    y: Math.floor(i / 4) * 140,
  });
  return sceneSchema.parse({
    elements: [
      ...labels.flatMap((label, i) => [
        {
          id: `node-${i}`,
          type: "rectangle",
          ...position(i),
          width: 180,
          height: 90,
        },
        {
          id: `label-${i}`,
          type: "text",
          x: position(i).x + 10,
          y: position(i).y + 20,
          width: 160,
          height: 50,
          text: label,
          originalText: label,
          containerId: `node-${i}`,
        },
      ]),
      ...edges.map(([from, to], i) => ({
        id: `edge-${i}`,
        type: "arrow",
        x: position(from).x + 180,
        y: position(from).y + 45,
        width: Math.abs(position(to).x - position(from).x - 180),
        height: Math.abs(position(to).y - position(from).y),
        points: [
          [0, 0],
          [
            position(to).x - position(from).x - 180,
            position(to).y - position(from).y,
          ],
        ],
        startBinding: { elementId: `node-${from}` },
        endBinding: { elementId: `node-${to}` },
        startArrowhead: null,
        endArrowhead: "arrow",
      })),
    ],
  });
}
