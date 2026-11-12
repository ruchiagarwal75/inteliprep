import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const css = readFileSync("src/app/theme.css", "utf8");
function palette(theme: "light" | "dark") {
  const root = /:root\s*\{([^}]+)\}/u.exec(css)?.[1] ?? "";
  const dark = /\[data-theme="dark"\]\s*\{([^}]+)\}/u.exec(css)?.[1] ?? "";
  const colors = Object.fromEntries(
    [
      ...(root + (theme === "dark" ? dark : "")).matchAll(
        /(--[\w-]+):\s*([^;]+);/gu,
      ),
    ].map((m) => [m[1], m[2].trim()]),
  );
  function color(name: string): string {
    const value = colors[name];
    if (!value) throw Error(`Unknown theme token ${name}`);
    const alias = /^var\((--[\w-]+)\)$/u.exec(value);
    return alias ? color(alias[1]) : value;
  }
  return color;
}
function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/../gu)
    ?.map((n) => parseInt(n, 16) / 255);
  if (!channels || channels.length !== 3)
    throw Error(`Not an opaque color: ${hex}`);
  const [r, g, b] = channels.map((n) =>
    n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
describe("application palette", () => {
  it("keeps UI and SVG color literals out of app components and page styles", () => {
    expect(
      execFileSync(process.execPath, ["scripts/check-theme-colors.mjs"], {
        encoding: "utf8",
      }),
    ).toContain("all app-owned UI colors use shared tokens");
  });
  for (const theme of ["light", "dark"] as const)
    it(`meets AA for text, controls, feedback and chart labels in ${theme}`, () => {
      const color = palette(theme);
      const pairs = [
        ...[
          "--background",
          "--surface",
          "--surface-raised",
          "--surface-inset",
        ].flatMap((bg) => [
          ["--foreground", bg],
          ["--muted", bg],
          ["--accent-text", bg],
          ["--danger", bg],
          ["--streak-flame", bg],
        ]),
        ...["violet", "sky", "coral", "world-gold"].flatMap((world) => [
          ["--game-on-world", `--game-${world}`],
          [`--game-${world}-text`, `--game-${world}-soft`],
          [`--game-${world}-text`, `--game-${world}-bg`],
        ]),
        ["--game-chest", "--game-chest-soft"],
        ["--game-gold", "--game-gold-soft"],
        ["--game-gold", "--game-correct-soft"],
        ["--foreground", "--game-correct-soft"],
        ["--muted", "--game-correct-soft"],
        ["--foreground", "--game-wrong-soft"],
        ["--muted", "--game-wrong-soft"],
        ["--game-correct", "--game-correct-soft"],
        ["--game-wrong", "--game-wrong-soft"],
        ["--game-reward", "--game-reward-soft"],
        ["--on-accent", "--accent"],
        ["--on-accent", "--accent-hover"],
        ["--accent-text", "--accent-soft"],
        ["--warning-text", "--warning-bg"],
        ["--info-text", "--info-bg"],
        ["--danger", "--danger-soft"],
        ["--bubble-user-text", "--bubble-user-bg"],
        ["--arch-label", "--arch-panel"],
        ["--arch-caption", "--arch-panel"],
      ];
      for (const [text, bg] of pairs) {
        const a = luminance(color(text)),
          b = luminance(color(bg));
        expect(
          (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
          `${theme}: ${text} on ${bg}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
      expect(color("--diagram-export-background")).toBe("#ffffff");
    });
});
