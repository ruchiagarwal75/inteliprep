import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** App-owned UI colors belong in theme.css, including SVG paint and admin utilities. */
export function themeColorViolations(source) {
  const patterns = [
    /#[\da-f]{3,8}\b/giu,
    /\b(?:rgb|hsl|oklch|lab|color)\(/giu,
    /(?:^|[\s"'`:])(?:[\w-]+:)*(?:bg|text|border|ring|fill|stroke|outline|shadow)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})\b/gu,
    /(?:^|[\s"'`:])(?:[\w-]+:)*(?:bg|text|border|ring|fill|stroke)-(?:white|black|transparent)\b/gu,
    /(?:fill|stroke|background(?:-color)?|color)\s*[:=]\s*["']?(?:white|black|transparent)\b/giu,
  ];
  return patterns.flatMap((pattern) =>
    [...source.matchAll(pattern)].map((match) => ({
      line: source.slice(0, match.index).split("\n").length,
      value: match[0].trim(),
    })),
  );
}
export function checkThemeColors(directory = "src") {
  const failures = [];
  function visit(folder) {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const path = `${folder}/${entry.name}`;
      if (entry.isDirectory()) {
        if (entry.name !== "fixtures") visit(path);
      } else if (
        /\.(?:css|tsx?|jsx?)$/u.test(path) &&
        !/\.test\./u.test(path) &&
        entry.name !== "theme.css"
      ) {
        for (const violation of themeColorViolations(
          readFileSync(path, "utf8"),
        ))
          failures.push(`${path}:${violation.line}: ${violation.value}`);
      }
    }
  }
  visit(directory);
  return failures;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const failures = checkThemeColors();
  if (failures.length) {
    console.error(
      "Move app colors into src/app/theme.css:\n" + failures.join("\n"),
    );
    process.exitCode = 1;
  } else
    console.log("Theme colors: all app-owned UI colors use shared tokens.");
}
