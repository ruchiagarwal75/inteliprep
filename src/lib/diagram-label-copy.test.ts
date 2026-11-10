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
    ),
  ).toBe('How does the "Redis cache" call your "Link store" through an "API"?');
});
it("does not match labels inside other words or add double quotes", () => {
  expect(
    quoteDiagramLabels('The "API" uses a cacheable key in the Redis cache.', [
      "API",
      "cache",
      "Redis cache",
    ]),
  ).toBe('The "API" uses a cacheable key in the "Redis cache".');
});
