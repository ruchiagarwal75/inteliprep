import { PIXEL_GRIDS, PIXEL_PALETTES } from "./pixel-art";
import { compileSprite } from "./pixel-grid";
function frame(open: 0 | 1 | 2) {
  const rows = Array.from({ length: 14 }, () => "............");
  if (open === 0) PIXEL_GRIDS.chest.forEach((r, y) => (rows[y + 5] = r));
  else {
    PIXEL_GRIDS.chest
      .slice(0, 4)
      .forEach((r, y) => (rows[y + (open === 1 ? 4 : 3)] = r));
    PIXEL_GRIDS.chest.slice(4).forEach((r, y) => (rows[y + 9] = r));
    rows[8] = "kYYYYYYYYYYk";
    if (open === 2) {
      rows[0] = "..Y.........";
      rows[1] = "........Y...";
      rows[2] = ".....Y......";
      rows[7] = "kYYYYYYYYYYk";
    } else rows[2] = ".....Y......";
  }
  return compileSprite(rows, PIXEL_PALETTES.chest);
}
export const CHEST_FRAMES = [frame(0), frame(1), frame(2)] as const;
