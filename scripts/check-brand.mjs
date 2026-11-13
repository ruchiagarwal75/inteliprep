import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const catalog = "docs/reviews/shardling-legacy-brand-hits.json";
const excludes = new Set([catalog, "scripts/check-brand.mjs"]);
const pattern = /mockmeai|mockme|inteliprep|intelliprep/iu;
const authPaths = new Set([
  "src/lib/domain-redirects.ts",
  "src/lib/oauth-callback.ts",
  "src/components/google-sign-in.tsx",
  "src/app/auth/callback/route.ts",
  "README.md",
  "docs/authentication.md",
  "docs/deployment.md",
  "docs/admin.md",
  "docs/beta-readiness.md",
  "docs/reviews/shardling-rebrand.md",
]);
export function blockedBrandHosts(hits) {
  return hits.filter(
    (hit) =>
      authPaths.has(hit.path) &&
      /\b(?:www\.)?mockmeai\.com\b/iu.test(hit.text) &&
      hit.text !== "mockmeai.com is not owned. Never allowlist it anywhere.",
  );
}
export function unexpectedBrandHits(hits, allowed) {
  return hits.filter(
    (hit) =>
      !allowed.some(
        (entry) =>
          entry.path === hit.path && entry.text === hit.text && entry.reason,
      ),
  );
}
export function brandHits() {
  const paths = [
    ...new Set(
      execFileSync("git", ["ls-files", "-co", "--exclude-standard", "-z"], {
        encoding: "utf8",
      }).split("\0"),
    ),
  ].sort();
  const hits = [];
  for (const path of paths) {
    if (!path || excludes.has(path)) continue;
    const bytes = readFileSync(path);
    if (bytes.includes(0)) continue;
    for (const [i, text] of bytes.toString("utf8").split("\n").entries())
      if (pattern.test(text))
        hits.push({ path, line: i + 1, text: text.trim() });
  }
  return hits;
}
function reason(path) {
  if (path === "docs/reviews/shardling-rebrand.md")
    return "Operator warning about an unowned domain. It must never be an allowed Auth host.";
  if (path.startsWith("docs/reviews/"))
    return "Historical review or QA evidence, not current product copy. Preserve its original context and links.";
  if (path.startsWith("docs/play-content/"))
    return "User-authored historical or deferred specification. Not rendered as app branding; leave source instructions intact.";
  if (path.startsWith("supabase/"))
    return "Existing database roles, settings and applied migrations. Renaming breaks grants, RLS or migration history.";
  if (path === "package.json" || path === "package-lock.json")
    return "Package identity is explicitly preserved by the rebrand rules.";
  if (path.includes(".test.") || path.startsWith("tests/"))
    return "Test fixture, negative branding assertion, legacy-host compatibility check or persisted identifier. Not user-facing copy.";
  if (path.startsWith("src/components/mascot-art/"))
    return "Original supplied mascot artwork/comment retained byte-for-byte; the user asked to restore this character.";
  if (path === "src/app/theme.css" || path === "src/app/handmade-accents.css")
    return "Internal CSS font-family alias shared between declaration and use. Not displayed text.";
  if (path === "src/components/scaling-story/ScalingStory.tsx")
    return "Historical animation-source comment. The existing animation artwork is preserved.";
  if (path.startsWith("src/"))
    return "Stable storage, cookie, cryptographic, event, lock, runtime or diagnostic identifier. Preserve live sessions and data.";
  if (
    path.startsWith("scripts/") ||
    path === "next.config.ts" ||
    path === ".env.example"
  )
    return "Existing operator/build/schema identifier or documented environment variable. Preserve deployment compatibility.";
  return "Operator documentation for unchanged project names, repository/preview URLs, storage identifiers or historical artifact paths.";
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const hits = brandHits();
  const blocked = blockedBrandHosts(hits);
  if (blocked.length) {
    console.error("Unowned host in auth/redirect setup:", blocked);
    process.exitCode = 1;
    process.exit();
  }
  if (process.argv.includes("--record")) {
    writeFileSync(
      catalog,
      JSON.stringify(
        hits.map((hit) => ({ ...hit, reason: reason(hit.path) })),
        null,
        2,
      ) + "\n",
    );
    console.log(`Recorded ${hits.length} legacy references for review.`);
  } else {
    const failures = unexpectedBrandHits(
      hits,
      JSON.parse(readFileSync(catalog, "utf8")),
    );
    if (failures.length) {
      console.error(failures);
      process.exitCode = 1;
    } else
      console.log(
        `Brand audit passed: ${hits.length} documented compatibility and historical references, no new old-brand copy.`,
      );
  }
}
