import { readFileSync, writeFileSync } from "node:fs";
import { format } from "prettier";
const source = readFileSync("docs/play-content/welcome-intro.md", "utf8");
const grids = [
  ...source
    .slice(source.indexOf("## Boss art"))
    .matchAll(/```\s*\n([.A-Za-z\n]+)\n```/gu),
].map((match) => match[1].trim().split("\n"));
if (
  grids.length !== 2 ||
  grids.some(
    (grid) => grid.length !== 32 || grid.some((row) => row.length !== 32),
  )
)
  throw Error("Expected the two supplied 32 by 32 boss grids");
const output = await format(
  `// Generated from the supplied grids in welcome-intro.md. Do not redraw.\nexport const BOSS_GRIDS = ${JSON.stringify({ idle: grids[0], defeated: grids[1] }, null, 2)} as const;\n`,
  { parser: "typescript" },
);
const path = "src/components/play/boss-art.ts";
if (process.argv.includes("--check")) {
  if (readFileSync(path, "utf8") !== output)
    throw Error("Boss grids changed. Run node scripts/build-boss-art.mjs");
} else writeFileSync(path, output);
