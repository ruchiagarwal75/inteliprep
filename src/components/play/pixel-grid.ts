export type PixelArt = {
  width: number;
  height: number;
  runs: { x: number; y: number; width: number; color: string }[];
};
/** Compile source rows once. Adjacent pixels share a rectangle without changing any cell. */
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
  return { width, height: grid.length, runs };
}
