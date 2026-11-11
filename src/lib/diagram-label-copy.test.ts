import { expect, it } from "vitest";
import { formatDiagramLabels } from "@/lib/diagram-label-copy";
for (const track of ["core", "genai"] as const) {
  it.each([
    {
      text: "If a worker crashes, what does the retry queue do?",
      labels: ["Worker", "Retry queue"],
    },
    {
      text: "What happens to an employee's question if the ACL vector index is down?",
      labels: ["Employee", "ACL vector index"],
    },
    {
      text: "How does the vector DB stay in sync with the citation check?",
      labels: ["Vector DB", "Citation check"],
    },
    {
      text: "What happens to cache hit rate when the cache is cold after a deploy?",
      labels: ["Cache", "Users", "LLM"],
    },
    {
      text: "How do users see a partial answer if the LLM stalls mid-stream?",
      labels: ["Cache", "Users", "LLM"],
    },
    {
      text: "If two API servers request an ID at the same time, how does the ID generator avoid collisions?",
      labels: ["API servers", "ID generator"],
    },
  ])(
    `preserves the exact natural sentence on ${track}: $text`,
    ({ text, labels }) =>
      expect(formatDiagramLabels(text, labels, track)).toBe(text),
  );
  it(
    "lowercases all labels without a common-word list or quotes on " + track,
    () => {
      expect(
        formatDiagramLabels(
          'How does "Retry queue" deliver to Worker after the ACL Vector Index fails?',
          ["Retry queue", "Worker", "ACL Vector Index"],
          track,
        ),
      ).toBe(
        "How does retry queue deliver to worker after the ACL vector index fails?",
      );
      expect(
        formatDiagramLabels(
          'The Redis cache reads from "Link store". What does Redis cache retain?',
          ["cache", "Redis cache", "Link store"],
          track,
        ),
      ).toBe(
        "The redis cache reads from link store. What does redis cache retain?",
      );
    },
  );
}
it("treats untrusted punctuation as literal text and preserves acronyms", () => {
  expect(
    formatDiagramLabels("What reaches API (v2) through the gpu and db?", [
      "API (v2)",
      "GPU",
      "DB",
    ]),
  ).toBe("What reaches API (v2) through the GPU and DB?");
  expect(
    formatDiagramLabels('The "API" uses a cacheable key in Redis cache.', [
      "API",
      "cache",
      "Redis cache",
    ]),
  ).toBe("The API uses a cacheable key in redis cache.");
});
it("capitalizes sentence starts and preserves possessives", () => {
  expect(
    formatDiagramLabels(
      "Cache warms up. Users reach the Employee's API through Vector DB.",
      ["Cache", "Users", "Employee", "API", "Vector DB"],
    ),
  ).toBe("Cache warms up. Users reach the employee's API through vector DB.");
});
