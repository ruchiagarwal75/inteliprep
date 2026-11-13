/** Local-only pixel conversion. Original supplied files in public/brand stay unchanged. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import sharp from "sharp";
const require = createRequire(import.meta.url);
const fontkit = require("next/dist/compiled/@next/font/dist/fontkit").default;
const folder = "public/brand/pixel";
mkdirSync(folder, { recursive: true });
const original = readFileSync("public/brand/shardling-mark.svg", "utf8");
const palette = [
  ...new Set(
    [...original.matchAll(/(?:fill|stroke)="(#[\da-f]{6})"/giu)].map(
      (m) => m[1],
    ),
  ),
];
const rgb = (color) =>
  [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
const colors = palette.map((color) => ({ color, rgb: rgb(color) }));
function closest(r, g, b) {
  return colors.reduce(
    (best, next) => {
      const distance = next.rgb.reduce(
        (sum, value, i) => sum + (value - [r, g, b][i]) ** 2,
        0,
      );
      return distance < best.distance ? { color: next.color, distance } : best;
    },
    { color: palette[0], distance: Infinity },
  ).color;
}
function grid(data, width, height, colorFor) {
  const cells = [];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] >= 128)
        cells.push({
          x,
          y,
          color: colorFor(data[i], data[i + 1], data[i + 2]),
        });
    }
  return cells;
}
function rects(cells, scale = 1, x = 0, y = 0) {
  return cells
    .map(
      (c) =>
        `<rect x="${x + c.x * scale}" y="${y + c.y * scale}" width="${scale}" height="${scale}" fill="${c.color}"/>`,
    )
    .join("");
}
const mascot = await sharp(Buffer.from(original))
  .resize(40, 44, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .ensureAlpha()
  .raw()
  .toBuffer();
const mark = grid(mascot, 40, 44, closest);
// Keep the original two white eye glints when their subpixel circles are downsampled.
for (const m of original.matchAll(
  /<circle cx="([\d.]+)" cy="([\d.]+)" r="[\d.]+" fill="#ffffff"/gu,
)) {
  const x = Math.round(((Number(m[1]) - 90) * 40) / 138),
    y = Math.round(((Number(m[2]) - 40) * 44) / 152);
  const cell = mark.find((c) => c.x === x && c.y === y);
  if (cell) cell.color = "#ffffff";
}
const font = fontkit(
  readFileSync("public/fonts/play/PressStart2P-latin.woff2"),
);
const run = font.layout("shardling");
let advance = 0;
const paths = run.glyphs
  .map((glyph, i) => {
    const p = run.positions[i],
      d = `<path transform="translate(${advance + p.xOffset} ${p.yOffset})" d="${glyph.path.toSVG()}"/>`;
    advance += p.xAdvance;
    return d;
  })
  .join("");
const width = Math.ceil((advance * 8) / font.unitsPerEm);
const textSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="12"><g fill="#ffffff" transform="translate(0 8) scale(${8 / font.unitsPerEm} ${-8 / font.unitsPerEm})">${paths}</g></svg>`;
const textData = await sharp(Buffer.from(textSvg))
  .ensureAlpha()
  .raw()
  .toBuffer();
let letters = grid(textData, width, 12, () => "currentColor");
const minX = Math.min(...letters.map((c) => c.x)),
  minY = Math.min(...letters.map((c) => c.y));
letters = letters.map((c) => ({ ...c, x: c.x - minX, y: c.y - minY }));
const textWidth = Math.max(...letters.map((c) => c.x)) + 1,
  textHeight = Math.max(...letters.map((c) => c.y)) + 1;
const ink = "#1c2b4a",
  mint = "#7ff0dc";
const totalWidth = 52 + textWidth * 2,
  totalHeight = 48;
const svg = (title, w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" shape-rendering="crispEdges"><title>${title}</title>${body}</svg>\n`;
const markSvg = svg("Shardling pixel mascot", 48, 48, rects(mark, 1, 4, 2));
const lockup = (color) =>
  svg(
    "shardling pixel logo",
    totalWidth,
    totalHeight,
    `<g data-pixel-mascot="">${rects(mark, 1, 0, 2)}</g><g data-pixel-wordmark="" color="${color}">${rects(letters, 2, 52, Math.floor((totalHeight - textHeight * 2) / 2))}</g>`,
  );
const light = lockup(ink),
  dark = lockup(mint);
for (const [file, data] of [
  ["shardling-mark.svg", markSvg],
  ["favicon.svg", markSvg],
  ["shardling-icon.svg", markSvg],
  ["shardling-lockup.svg", light],
  ["shardling-lockup-dark.svg", dark],
])
  writeFileSync(`${folder}/${file}`, data);
const pngs = new Map();
for (const [size, file] of [
  [16, "favicon-16.png"],
  [32, "favicon-32.png"],
  [180, "apple-touch-icon-180.png"],
  [192, "icon-192.png"],
  [512, "icon-512.png"],
]) {
  const output = await sharp(Buffer.from(markSvg))
    .resize(size, size, { kernel: "nearest" })
    .png()
    .toBuffer();
  pngs.set(size, output);
  writeFileSync(`${folder}/${file}`, output);
}
const images = [pngs.get(16), pngs.get(32)];
const header = Buffer.alloc(6 + 16 * images.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
let offset = header.length;
images.forEach((data, i) => {
  const entry = 6 + 16 * i,
    size = i ? 32 : 16;
  header[entry] = size;
  header[entry + 1] = size;
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(data.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += data.length;
});
const ico = Buffer.concat([header, ...images]);
writeFileSync(`${folder}/favicon.ico`, ico);
// Social cards need a solid background; use navy rather than a white plate.
const og = svg(
  "Shardling system design practice",
  1200,
  630,
  `<rect width="1200" height="630" fill="${ink}"/><g transform="translate(${(1200 - totalWidth * 5) / 2} ${(630 - totalHeight * 5) / 2}) scale(5)"><g>${rects(mark, 1, 0, 2)}</g><g color="${mint}">${rects(letters, 2, 52, Math.floor((totalHeight - textHeight * 2) / 2))}</g></g>`,
);
await sharp(Buffer.from(og)).png().toFile(`${folder}/og-image-1200x630.png`);
const aliases = {
  "src/app/icon.svg": "favicon.svg",
  "src/app/favicon.ico": "favicon.ico",
  "src/app/apple-icon.png": "apple-touch-icon-180.png",
  "public/brand-mark.svg": "shardling-mark.svg",
  "public/brand-lockup.svg": "shardling-lockup.svg",
  "public/favicon.svg": "favicon.svg",
  "public/favicon-32x32.png": "favicon-32.png",
  "public/apple-touch-icon.png": "apple-touch-icon-180.png",
  "public/icon-192.png": "icon-192.png",
  "public/icon-512.png": "icon-512.png",
  "public/og-image.png": "og-image-1200x630.png",
};
for (const [alias, file] of Object.entries(aliases))
  writeFileSync(alias, readFileSync(`${folder}/${file}`));
console.log(
  JSON.stringify({
    mascotGrid: "40x44",
    textFont: "Press Start 2P",
    logoSize: [totalWidth, totalHeight],
    transparent: true,
    palette,
  }),
);
