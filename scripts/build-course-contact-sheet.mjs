import sharp from "sharp";
import { mkdir, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
const folder = resolve(process.argv[2] ?? "artifacts/course-content-3");
const sets = {
  content3: [
    [4, 2],
    [4, 3],
    [4, 6],
    [4, 8],
    [5, 1],
    [5, 3],
    [5, 9],
    [5, 10],
    [6, 2],
    [6, 5],
    [6, 6],
    [6, 8],
  ],
  content4: [
    [7, 1],
    [7, 4],
    [7, 6],
    [7, 7],
    [8, 2],
    [8, 3],
    [8, 5],
    [8, 9],
    [9, 1],
    [9, 3],
    [9, 4],
    [9, 11],
  ],
};
const set = process.argv[3] ?? "content3";
if (!Object.hasOwn(sets, set)) throw Error("Choose content3 or content4.");
const diagrams = sets[set];
await mkdir(folder, { recursive: true });
for (const theme of ["light", "dark"])
  for (const width of [1440, 375]) {
    const columns = 3,
      cellWidth = width === 1440 ? 620 : 340,
      cellHeight = width === 1440 ? 240 : 640;
    const background = theme === "light" ? "#ffffff" : "#111827",
      foreground = theme === "light" ? "#111827" : "#f8fafc";
    const composites = [];
    for (const [index, [topic, slide]] of diagrams.entries()) {
      const source = await readFile(
        join(folder, `T${topic}-S${slide}-${theme}-${width}-diagram.png`),
      );
      const image = await sharp(source)
        .resize({
          width: cellWidth - 24,
          height: cellHeight - 52,
          fit: "inside",
        })
        .png()
        .toBuffer();
      const dimensions = await sharp(image).metadata();
      const left = (index % columns) * cellWidth,
        top = Math.floor(index / columns) * cellHeight;
      const title = Buffer.from(
        `<svg width="${cellWidth}" height="32"><text x="12" y="24" font-family="Arial,sans-serif" font-size="18" fill="${foreground}">Topic ${topic}, slide ${slide}</text></svg>`,
      );
      composites.push(
        { input: title, left, top },
        {
          input: image,
          left: left + Math.floor((cellWidth - (dimensions.width ?? 0)) / 2),
          top: top + 40,
        },
      );
    }
    await sharp({
      create: {
        width: columns * cellWidth,
        height: 4 * cellHeight,
        channels: 4,
        background,
      },
    })
      .composite(composites)
      .jpeg({ quality: 92 })
      .toFile(join(folder, `contact-${theme}-${width}.jpg`));
  }
console.log(
  "Created four contact sheets for the twelve responsive course diagrams.",
);
