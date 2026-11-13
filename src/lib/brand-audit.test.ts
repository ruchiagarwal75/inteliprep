import { readFileSync } from "node:fs";
import { z } from "zod";
import { expect, it } from "vitest";
import {
  brandHits,
  unexpectedBrandHits,
  blockedBrandHosts,
} from "../../scripts/check-brand.mjs";
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
  expect(blockedBrandHosts(actual)).toEqual([]);
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
it("blocks the unowned host in redirect/auth setup even if a legacy catalog would approve it", () => {
  for (const path of [
    "src/lib/domain-redirects.ts",
    "docs/authentication.md",
    "docs/deployment.md",
    "docs/reviews/shardling-rebrand.md",
  ]) {
    expect(
      blockedBrandHosts([
        { path, line: 1, text: "https://mockmeai.com/auth/callback" },
      ]),
    ).toHaveLength(1);
    expect(
      blockedBrandHosts([
        {
          path,
          line: 1,
          text: "mockmeai.com is not owned. Never allowlist it anywhere.",
        },
      ]),
    ).toEqual([]);
  }
});
