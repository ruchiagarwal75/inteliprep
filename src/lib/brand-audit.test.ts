import { readFileSync } from "node:fs";
import { z } from "zod";
import { expect, it } from "vitest";
import { brandHits, unexpectedBrandHits } from "../../scripts/check-brand.mjs";
const hit = z.object({ path: z.string(), line: z.number(), text: z.string() });
const allowed = hit.extend({ reason: z.string().min(1) });
it("reports every remaining legacy reference and rejects new brand copy", () => {
  const actual = z.array(hit).parse(brandHits());
  const approved = z
    .array(allowed)
    .parse(
      JSON.parse(
        readFileSync("docs/reviews/shardling-legacy-brand-hits.json", "utf8"),
      ),
    );
  expect(unexpectedBrandHits(actual, approved)).toEqual([]);
  expect(
    unexpectedBrandHits(
      [
        {
          path: "src/components/new.tsx",
          line: 1,
          text: "Welcome to MockMeAI",
        },
      ],
      approved,
    ),
  ).toHaveLength(1);
});
