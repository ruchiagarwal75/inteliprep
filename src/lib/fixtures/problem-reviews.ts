import rateLimiter from "@/lib/fixtures/problem-reviews/rate-limiter.json";
import chatService from "@/lib/fixtures/problem-reviews/chat-service.json";
import newsFeed from "@/lib/fixtures/problem-reviews/news-feed.json";
import { sceneSchema } from "@/lib/scene";

/** Synthetic inputs for wiring checks now and reviewed real-model evaluations later. */
export const problemReviews = [rateLimiter, chatService, newsFeed];

export function reviewScene(example: (typeof problemReviews)[number]) {
  const nodes = example.nodes.flatMap((label, index) => [
    {
      id: "node-" + index,
      type: "rectangle",
      x: index * 200,
      y: 0,
      width: 150,
      height: 80,
    },
    {
      id: "label-" + index,
      type: "text",
      x: index * 200 + 10,
      y: 20,
      width: 130,
      height: 40,
      text: label,
      containerId: "node-" + index,
    },
  ]);
  const edges = example.edges.map(([start, end], index) => ({
    id: "edge-" + index,
    type: "arrow",
    x: start * 200 + 150,
    y: 40,
    width: Math.abs(end - start) * 200 - 150,
    height: 0,
    points: [
      [0, 0],
      [(end - start) * 200 - 150, 0],
    ],
    startBinding: { elementId: "node-" + start },
    endBinding: { elementId: "node-" + end },
    startArrowhead: null,
    endArrowhead: "arrow",
  }));
  return sceneSchema.parse({ elements: [...nodes, ...edges] });
}
