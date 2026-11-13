import { readFileSync } from "node:fs";
import sharp from "sharp";
import { expect, it } from "vitest";
const directory = "public/brand/pixel";
it.each([
  "shardling-lockup.svg",
  "shardling-lockup-dark.svg",
  "shardling-mark.svg",
  "shardling-icon.svg",
  "favicon.svg",
])("%s has integer pixel geometry and a transparent canvas", async (name) => {
  const source = readFileSync(`${directory}/${name}`, "utf8");
  expect(source).toContain('shape-rendering="crispEdges"');
  expect(source).not.toMatch(
    /<(?:path|text|image|filter|foreignObject|ellipse|circle)\b/u,
  );
  const rects = [
    ...source.matchAll(
      /<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/gu,
    ),
  ];
  expect(rects.length).toBeGreaterThan(100);
  for (const rect of rects)
    for (const coordinate of rect.slice(1))
      expect(Number.isInteger(Number(coordinate))).toBe(true);
  const { data, info } = await sharp(Buffer.from(source))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (const index of [
    0,
    info.width - 1,
    info.width * (info.height - 1),
    info.width * info.height - 1,
  ])
    expect(data[index * 4 + 3]).toBe(0);
  expect([...data].some((value, i) => i % 4 === 3 && value === 255)).toBe(true);
});
it.each([
  "favicon-16.png",
  "favicon-32.png",
  "apple-touch-icon-180.png",
  "icon-192.png",
  "icon-512.png",
])("%s keeps its background transparent", async (name) => {
  const { data, info } = await sharp(readFileSync(`${directory}/${name}`))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (const index of [
    0,
    info.width - 1,
    info.width * (info.height - 1),
    info.width * info.height - 1,
  ])
    expect(data[index * 4 + 3]).toBe(0);
});
it("has pixel lettering in both modes and a navy social card rather than a white panel", async () => {
  for (const theme of ["shardling-lockup.svg", "shardling-lockup-dark.svg"])
    expect(readFileSync(`${directory}/${theme}`, "utf8")).toContain(
      "data-pixel-wordmark",
    );
  const { data } = await sharp(
    readFileSync(`${directory}/og-image-1200x630.png`),
  )
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  expect([...data.subarray(0, 4)]).toEqual([28, 43, 74, 255]);
});
