import { expect, test } from "@playwright/test";
import { signIn } from "./fixture-auth";
import { PIXEL_ART } from "../../src/components/play/pixel-art";
import { MASCOT_ART } from "../../src/components/play/pixel-mascot-art";
import { BOSS_GRIDS } from "../../src/components/play/boss-art";
import { compileSprite } from "../../src/components/play/pixel-grid";
import { THEME_COOKIE } from "../../src/lib/theme-preference";

test("packed SVG paths paint exactly the same pixels as the original row runs", async ({
  page,
  context,
}) => {
  await signIn(context, "fixes4Path");
  const letters = [
    ...new Set(Object.values(BOSS_GRIDS).flat().join("")),
  ].filter((c) => c !== ".");
  const palette = Object.fromEntries(
    letters.map((c, i) => [
      c,
      `rgb(${20 + i * 10},${80 + i * 5},${100 + i * 3})`,
    ]),
  );
  const arts = [
    ...Object.values(PIXEL_ART),
    ...Object.values(MASCOT_ART),
    ...Object.values(BOSS_GRIDS).map((grid) => compileSprite(grid, palette)),
  ];
  for (const theme of ["light", "dark"]) {
    await context.addCookies([
      { name: THEME_COOKIE, value: theme, url: "http://localhost:3100" },
    ]);
    await page.goto("/play/rag");
    const failures = await page.evaluate(async (arts) => {
      const ns = "http://www.w3.org/2000/svg",
        colors = new Map<string, string>();
      const main = document.querySelector("main");
      if (!main) throw Error("Missing page frame");
      const frame = main;
      function color(value: string) {
        const found = colors.get(value);
        if (found) return found;
        const svg = document.createElementNS(ns, "svg"),
          rect = document.createElementNS(ns, "rect");
        svg.setAttribute("width", "0");
        svg.setAttribute("height", "0");
        rect.setAttribute("fill", value);
        svg.append(rect);
        frame.append(svg);
        const result = getComputedStyle(rect).fill;
        svg.remove();
        colors.set(value, result);
        return result;
      }
      async function raster(art: (typeof arts)[number], packed: boolean) {
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("width", String(art.width * 3));
        svg.setAttribute("height", String(art.height * 3));
        svg.setAttribute("viewBox", `0 0 ${art.width} ${art.height}`);
        svg.setAttribute("shape-rendering", "crispEdges");
        if (packed)
          for (const p of art.paths) {
            const el = document.createElementNS(ns, "path");
            el.setAttribute("d", p.d);
            el.setAttribute("fill", color(p.color));
            svg.append(el);
          }
        else
          for (const r of art.runs) {
            const el = document.createElementNS(ns, "rect");
            for (const [key, value] of Object.entries({
              x: r.x,
              y: r.y,
              width: r.width,
              height: 1,
            }))
              el.setAttribute(key, String(value));
            el.setAttribute("fill", color(r.color));
            svg.append(el);
          }
        const img = new Image();
        img.src =
          "data:image/svg+xml," +
          encodeURIComponent(new XMLSerializer().serializeToString(svg));
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = art.width * 3;
        canvas.height = art.height * 3;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw Error("Missing pixel renderer");
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      }
      const failures: number[] = [];
      for (const [i, art] of arts.entries()) {
        const [old, next] = await Promise.all([
          raster(art, false),
          raster(art, true),
        ]);
        if (old.some((value, index) => value !== next[index])) failures.push(i);
      }
      return failures;
    }, arts);
    expect(failures, theme).toEqual([]);
  }
});
