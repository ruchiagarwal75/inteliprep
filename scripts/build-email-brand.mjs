/** Local conversion of approved pixel artwork. No network requests or new dependencies. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import sharp from "sharp";

const folder = "public/brand/email";
mkdirSync(folder, { recursive: true });
const theme = readFileSync("src/app/theme.css", "utf8");
const backgrounds = [...theme.matchAll(/--pixel-sky:\s*(#[\da-f]{6});/giu)];
const background = backgrounds.at(-1)?.[1];
if (!background) throw Error("Missing dark brand background");
await sharp("public/brand/pixel/shardling-lockup-dark.svg")
  .resize(582, 144, { kernel: "nearest" })
  .flatten({ background })
  .png()
  .toFile(`${folder}/shardling-logo-v1.png`);

// Merge adjacent equal-color pixels without changing the supplied mascot.
const source = readFileSync("public/brand/pixel/shardling-mark.svg", "utf8");
const cells = [
  ...source.matchAll(
    /<rect x="(\d+)" y="(\d+)" width="1" height="1" fill="(#[\da-f]{6})"\/>/giu,
  ),
];
if (cells.length !== (source.match(/<rect /gu) ?? []).length)
  throw Error("Unexpected mascot artwork");
const runs = [];
for (const [, x, y, color] of cells) {
  const previous = runs.at(-1);
  if (
    previous &&
    previous.y === Number(y) &&
    previous.color === color &&
    previous.x + previous.width === Number(x)
  )
    previous.width++;
  else runs.push({ x: Number(x), y: Number(y), width: 1, color });
}
const rects = runs
  .map(
    ({ x, y, width, color }) =>
      `<rect x="${x}" y="${y}" width="${width}" height="1" fill="${color}"/>`,
  )
  .join("");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" version="1.2" baseProfile="tiny-ps" width="144" height="144" viewBox="0 0 48 48"><title>Shardling</title><desc>Shardling pixel mascot on its navy brand background.</desc><rect width="48" height="48" fill="${background}"/>${rects}</svg>\n`;
if (Buffer.byteLength(svg) > 32 * 1024)
  throw Error("BIMI artwork exceeds 32 KB");
const original = await sharp(Buffer.from(source))
  .resize(144, 144, { kernel: "nearest" })
  .flatten({ background })
  .raw()
  .toBuffer();
const converted = await sharp(Buffer.from(svg))
  .flatten({ background })
  .raw()
  .toBuffer();
if (!original.equals(converted))
  throw Error("BIMI conversion changed the artwork");
writeFileSync(`${folder}/shardling-bimi.svg`, svg);
console.log(
  "Built email logo PNG and lossless BIMI SVG. No DNS records were changed.",
);
