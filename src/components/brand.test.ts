import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { z } from "zod";
import { Brand, BrandLogo } from "./brand";
import manifest from "@/app/manifest";
const hashes = z
  .record(z.string(), z.string())
  .parse(JSON.parse(readFileSync("scripts/brand-asset-sha256.json", "utf8")));
it("uses transparent pixel lockups with a named Home link", () => {
  const html = renderToStaticMarkup(createElement(Brand));
  expect(html).toContain('aria-label="Shardling home"');
  expect(html).toContain("/brand/pixel/shardling-lockup.svg");
  expect(html).toContain("/brand/pixel/shardling-lockup-dark.svg");
  expect(html).not.toContain("<svg");
  expect(html).not.toContain("/brand-mark.svg");
  expect(
    renderToStaticMarkup(createElement(BrandLogo, { hero: true })),
  ).toContain("/brand/pixel/shardling-lockup.svg");
});
it.each(Object.entries(hashes))(
  "keeps supplied %s byte-for-byte",
  (name, hash) =>
    expect(
      createHash("sha256")
        .update(readFileSync(`public/brand/${name}`))
        .digest("hex"),
    ).toBe(hash),
);
it.each([
  ["src/app/favicon.ico", "favicon.ico"],
  ["src/app/icon.svg", "favicon.svg"],
  ["src/app/apple-icon.png", "apple-touch-icon-180.png"],
])("copies pixel %s for Next conventions", (alias, name) =>
  expect(
    readFileSync(alias).equals(readFileSync(`public/brand/pixel/${name}`)),
  ).toBe(true),
);
it.each([
  ["favicon-16.png", 16, 16],
  ["favicon-32.png", 32, 32],
  ["apple-touch-icon-180.png", 180, 180],
  ["icon-192.png", 192, 192],
  ["icon-512.png", 512, 512],
  ["og-image-1200x630.png", 1200, 630],
])("has the supplied dimensions for %s", (name, w, h) => {
  const data = readFileSync(`public/brand/${name}`);
  expect(data.readUInt32BE(16)).toBe(w);
  expect(data.readUInt32BE(20)).toBe(h);
});
it("uses the supplied manifest icons", () =>
  expect(manifest()).toMatchObject({
    icons: [
      { src: "/brand/pixel/icon-192.png" },
      { src: "/brand/pixel/icon-512.png" },
    ],
  }));
