import { expect, it } from "vitest";
import { quoteDiagramLabels } from "@/lib/diagram-label-copy";
it("makes Redis cache and Link store grammatical when labels enter a sentence", () => {
  expect(
    quoteDiagramLabels(
      "How does the counter in Redis cache decide what to admit from Link store?",
      ["Redis cache", "Link store"],
    ),
  ).toBe(
    'How does the counter in "Redis cache" decide what to admit from "Link store"?',
  );
});
it("preserves articles, existing quotes and the longer overlapping label", () => {
  expect(
    quoteDiagramLabels(
      'The Redis cache reads from "Link store". What does Redis cache retain?',
      ["cache", "Redis cache", "Link store"],
      "genai",
    ),
  ).toBe(
    'The "Redis cache" reads from "Link store". What does "Redis cache" retain?',
  );
});
it("treats punctuation in untrusted labels as literal text", () => {
  expect(quoteDiagramLabels("What reaches API (v2)?", ["API (v2)"])).toBe(
    'What reaches "API (v2)"?',
  );
});

it("quotes capitalized labels even after an article and preserves acronyms", () => {
  expect(
    quoteDiagramLabels(
      "How does the Redis cache call your Link store through an API?",
      ["Redis cache", "Link store", "API"],
      "genai",
    ),
  ).toBe('How does the "Redis cache" call your "Link store" through an API?');
});
it("does not match labels inside other words or add double quotes", () => {
  expect(
    quoteDiagramLabels(
      'The "API" uses a cacheable key in the Redis cache.',
      ["API", "cache", "Redis cache"],
      "genai",
    ),
  ).toBe('The "API" uses a cacheable key in the "Redis cache".');
});

for (const track of ["core", "genai"] as const) {
  it.each([
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
  ])(`keeps general words natural for ${track}: $text`, ({ text, labels }) =>
    expect(quoteDiagramLabels(text, labels, track)).toBe(text),
  );
}
it("restores core articles while retaining GenAI distinctive-name quoting", () => {
  expect(
    quoteDiagramLabels(
      "How does the Redis cache call your Link store?",
      ["Redis cache", "Link store"],
      "core",
    ),
  ).toBe("How does the Redis cache call your Link store?");
  expect(
    quoteDiagramLabels(
      "How does the Redis cache call your Link store?",
      ["Redis cache", "Link store"],
      "genai",
    ),
  ).toBe('How does the "Redis cache" call your "Link store"?');
  expect(
    quoteDiagramLabels(
      "Cache warms up. How do Users reach the Cache?",
      ["Cache", "Users"],
      "genai",
    ),
  ).toBe("Cache warms up. How do users reach the cache?");
});
