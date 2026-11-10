import { afterAll, expect, it, vi } from "vitest";
import { writeFileSync } from "node:fs";
import { calls, metered } from "./model-meter";
import { fixtureScene } from "./genai-fixture";
import { getProblem } from "@/lib/problems";
import { streamInterviewerReply } from "@/lib/llm";
import { gradeInterview } from "@/lib/interview-grading";
import { questionMemory } from "@/lib/question-memory";
import { graphToText } from "@/lib/scene-to-text";
import { sceneToGraph } from "@/lib/scene-graph";
import type { ChatMessage } from "@/lib/chat";
vi.mock("@/lib/observed-model-request", async () => import("./observed-live"));
afterAll(() =>
  writeFileSync(
    "artifacts/genai/url-baseline-usage.json",
    JSON.stringify(calls, null, 2),
  ),
);

it("measures a comparable nine-turn Senior URL shortener discussion and one grade", async () => {
  const problem = getProblem("url-shortener");
  if (!problem) throw new Error("Missing URL baseline");
  const labels = [
    "Client",
    "Load balancer",
    "API service",
    "ID allocator",
    "Redis cache",
    "Link store",
    "Metrics",
  ];
  const scene = fixtureScene(labels, [
    [0, 1],
    [1, 2],
    [2, 3],
    [2, 4],
    [2, 5],
    [2, 6],
  ]);
  const messages: ChatMessage[] = [
    {
      role: "assistant",
      content: "What would you clarify before starting your design?",
    },
    {
      role: "user",
      content:
        "I will clarify public create and redirect behavior, retention, availability and latency. Assuming the provided 1M creates and 100M redirects daily, average rates are about 11.6 creates/s and 1,157 redirects/s, ten-times peaks about 116 and 11,574. I assume about 500 bytes per mapping and will measure index overhead rather than ignore it.",
    },
  ];
  const rows = [
    [
      2,
      "An API validates URLs and creates immutable short-code mappings with idempotency keys. An allocator leases unique disjoint integer ranges using a fenced epoch, then APIs encode values in base62 and insert into a durable link store with a unique constraint. A response is successful only after the mapping is durable.",
    ],
    [
      2,
      "A failed allocator cannot issue a range without a committed lease. APIs can consume a leased range offline within its fenced ownership; after a crash I discard unused values rather than risk reissuing them. A duplicate insert is rejected and retried with a new ID, while a retried create returns the original mapping using its idempotency key.",
    ],
    [
      2,
      "Redirects use cache first, then the durable link store and populate a short TTL entry. Never cache missing data for long after creation; creation invalidates a negative entry and the redirect can read the authoritative record. Existing links are immutable except an explicit deletion tombstone.",
    ],
    [
      3,
      "I add a cache and store replicas to handle hot links and survive a node failure.",
    ],
    [
      3,
      "If Redis fails, bound database fallback with per-key coalescing and admission control so a hot link cannot stampede the store. A lagging replica cannot satisfy a freshly created mapping read unless it reaches the required commit position; otherwise use the leader or return an explicit retry. Do not claim a missing link from an uncertain replica.",
    ],
    [3, "Let's examine how I would validate those failure claims."],
    [
      3,
      "A load test combines hot-link skew with cache loss, replica delay and create/redirect races. Measure p95 redirect latency, error rate, storage load and read-after-create failures; define rollback thresholds before the test. Inject a crash after durable insert but before response to verify idempotency.",
    ],
    [
      3,
      "The link store partitions on a hash of the short code and uses replication with a stated consistency choice. A hot key is distributed by the cache; deletion is a tombstone propagated to replicas and invalidated from cache. If failover cannot preserve required create durability, reject new creates rather than acknowledge data loss.",
    ],
    [
      4,
      "I would compare cost per redirect from cache hit ratio, request bytes and storage replication. Longer cache TTL reduces database cost but slows deletions unless invalidation is reliable. Monitor errors, saturation, lag and cache hit rate, and use canaries with rollback for allocator or routing changes.",
    ],
  ] as const;
  const replies = [];
  for (const [stage, content] of rows) {
    messages.push({ role: "user", content });
    const reply = await metered("url-shortener-senior", async () => {
      let text = "";
      for await (const delta of streamInterviewerReply(
        messages,
        graphToText(sceneToGraph(scene)),
        "No changes.",
        AbortSignal.timeout(60000),
        undefined,
        {
          problem,
          level: "senior",
          phase: problem.phases[stage],
          progress: {
            step: "review",
            candidateTurns: messages.length,
            discussionTurnLimit: 99,
          },
          questionMemory: questionMemory(messages),
          designText: messages
            .filter((m) => m.role === "user")
            .map((m) => m.content)
            .join(" "),
          diagramLabels: labels,
        },
      ))
        text += delta;
      return text;
    });
    messages.push({ role: "assistant", content: reply });
    replies.push(reply);
  }
  const scorecard = await metered("url-shortener-strong-grade", () =>
    gradeInterview(
      problem,
      "senior",
      { messages, scene },
      new Date().toISOString(),
    ),
  );
  writeFileSync(
    "artifacts/genai/url-shortener-baseline.json",
    JSON.stringify({ messages, replies, scorecard, calls }, null, 2),
  );
  expect(scorecard.areas).toHaveLength(5);
});
