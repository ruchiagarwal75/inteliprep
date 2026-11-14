export type PixelArt = {
  width: number;
  height: number;
  runs: { x: number; y: number; width: number; color: string }[];
  paths: { color: string; d: string }[];
};
/** Compile once, packing same-colored runs into paths without changing any pixel. */
export function compileSprite(
  grid: readonly string[],
  palette: Readonly<Record<string, string>>,
): PixelArt {
  const width = grid[0]?.length ?? 0;
  if (!width || !grid.length || grid.some((row) => row.length !== width))
    throw Error("Invalid pixel grid dimensions");
  const runs: PixelArt["runs"] = [];
  grid.forEach((row, y) => {
    for (let x = 0; x < width;) {
      const key = row[x];
      let end = x + 1;
      while (end < width && row[end] === key) end++;
      if (key !== ".") {
        const color = palette[key];
        if (!color) throw Error("Unknown pixel palette key");
        runs.push({ x, y, width: end - x, color });
      }
      x = end;
    }
  });
  const rectangles: (PixelArt["runs"][number] & { height: number })[] = [];
  const last = new Map<string, (typeof rectangles)[number]>();
  for (const run of runs) {
    const key = `${run.x}/${run.width}/${run.color}`;
    const previous = last.get(key);
    if (previous && previous.y + previous.height === run.y) {
      previous.height++;
    } else {
      const rectangle = { ...run, height: 1 };
      rectangles.push(rectangle);
      last.set(key, rectangle);
    }
  }
  const colors = new Map<string, string[]>();
  for (const run of rectangles) {
    const segments = colors.get(run.color) ?? [];
    segments.push(
      `M${run.x} ${run.y}h${run.width}v${run.height}h-${run.width}z`,
    );
    colors.set(run.color, segments);
  }
  return {
    width,
    height: grid.length,
    runs,
    paths: [...colors].map(([color, segments]) => ({
      color,
      d: segments.join(""),
    })),
  };
}
