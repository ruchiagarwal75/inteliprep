import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Brand } from "./brand";
import { BrandFace } from "./brand-face";
import { buildMascotFace } from "./mascot-art/mascotArt";
import manifest from "@/app/manifest";
it("reuses the existing girl's face and lowercase wordmark without redrawing her", () => {
  const html = renderToStaticMarkup(createElement(BrandFace, { size: 16 }));
  expect(html).toContain(buildMascotFace());
  expect(html).toContain('width="16"');
  const logo = renderToStaticMarkup(createElement(Brand));
  expect(logo).toContain('aria-label="Shardling home"');
  expect(logo).toContain("shardling</span>");
});
it.each([
  ["favicon-32x32.png", 32, 32],
  ["apple-touch-icon.png", 180, 180],
  ["icon-192.png", 192, 192],
  ["icon-512.png", 512, 512],
  ["og-image.png", 1200, 630],
])("ships %s at its required size", (file, w, h) => {
  const png = readFileSync(`public/${file}`);
  expect(png.toString("ascii", 1, 4)).toBe("PNG");
  expect(png.readUInt32BE(16)).toBe(w);
  expect(png.readUInt32BE(20)).toBe(h);
});
it("provides matching vector assets and manifest icons", () => {
  for (const name of [
    "public/brand-mark.svg",
    "public/brand-lockup.svg",
    "public/favicon.svg",
    "src/app/icon.svg",
  ])
    expect(readFileSync(name, "utf8")).toMatch(/shardling/iu);
  expect(manifest()).toMatchObject({
    name: "Shardling",
    icons: [{ src: "/icon-192.png" }, { src: "/icon-512.png" }],
  });
});
