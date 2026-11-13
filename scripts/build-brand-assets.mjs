import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import sharp from "sharp";
import { buildMascotFace } from "../src/components/mascot-art/mascotArt.ts";
const require = createRequire(import.meta.url);
const fontkit = require("next/dist/compiled/@next/font/dist/fontkit").default;
const font = fontkit(readFileSync("public/fonts/brand/Nunito.ttf"));
const theme = readFileSync("src/app/theme.css", "utf8");
const token = (name, source = theme) => {
  const alias = new RegExp(`--${name}: var\\(--([a-z0-9-]+)\\);`, "u").exec(
    source,
  )?.[1];
  if (alias) return token(alias, source);
  const value = new RegExp(`--${name}: (#[a-f0-9]+);`, "u").exec(source)?.[1];
  if (!value) throw Error(`Missing theme token ${name}`);
  return value;
};
const lightInk = token("foreground");
const darkText = token(
  "foreground",
  theme.slice(theme.indexOf('[data-theme="dark"]')),
);
const accent = token("brand");
const face =
  '<circle cx="110" cy="124" r="72" fill="var(--mascot-color-f6efe0)"/>' +
  buildMascotFace();
const painted = face.replace(/var\(--([a-z0-9-]+)\)/gu, (_match, name) =>
  token(name),
);
const mark = `<svg x="0" y="0" width="72" height="72" viewBox="24 50 172 148">${painted}</svg>`;
function text(value, x, y, size, weight = 800, fill = "currentColor") {
  const run = font.getVariation({ wght: weight }).layout(value);
  let advance = 0;
  const glyphs = run.glyphs
    .map((glyph, i) => {
      const position = run.positions[i];
      const path = `<path transform="translate(${advance + position.xOffset} ${position.yOffset})" d="${glyph.path.toSVG()}"/>`;
      advance += position.xAdvance;
      return path;
    })
    .join("");
  return `<g fill="${fill}" transform="translate(${x} ${y}) scale(${size / font.unitsPerEm} ${-size / font.unitsPerEm})">${glyphs}</g>`;
}
const paints = `<style>:root{color:${lightInk}}@media(prefers-color-scheme:dark){:root{color:${darkText}}}</style>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="24 50 172 148" role="img"><title>Shardling mascot face</title>${painted}</svg>\n`;
const lockup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 72" role="img"><title>shardling</title>${paints}${mark}${text("shardling", 84, 49, 48)}</svg>\n`;
for (const file of [
  "public/brand-mark.svg",
  "public/favicon.svg",
  "src/app/icon.svg",
])
  writeFileSync(file, svg);
writeFileSync("public/brand-lockup.svg", lockup);
for (const [size, file] of [
  [32, "favicon-32x32.png"],
  [180, "apple-touch-icon.png"],
  [192, "icon-192.png"],
  [512, "icon-512.png"],
]) {
  const output = await sharp(Buffer.from(svg))
    .resize(size, size, { fit: "contain", background: token("background") })
    .png()
    .toBuffer();
  writeFileSync(`public/${file}`, output);
  if (size === 180) writeFileSync("src/app/apple-icon.png", output);
  if (size === 32) {
    const header = Buffer.alloc(22);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(1, 4);
    header[6] = 32;
    header[7] = 32;
    header.writeUInt16LE(1, 10);
    header.writeUInt16LE(32, 12);
    header.writeUInt32LE(output.length, 14);
    header.writeUInt32LE(22, 18);
    writeFileSync("src/app/favicon.ico", Buffer.concat([header, output]));
  }
}
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="${token("background")}"/><g transform="translate(68 78) scale(3)">${mark}</g>${text("shardling", 290, 235, 112, 800, lightInk)}<path d="M88 324H1112" stroke="${accent}" stroke-width="2"/>${text("System design and AI/ML interviews.", 88, 412, 42, 800, lightInk)}${text("An AI interviewer, a whiteboard, and a scorecard.", 88, 471, 32, 500, lightInk)}${text("shardling.com", 88, 564, 26, 800, accent)}</svg>`;
await sharp(Buffer.from(og)).png().toFile("public/og-image.png");
console.log("Built Shardling vector logos, icons and social image.");
