import { PIXEL_GRIDS, PIXEL_PALETTES } from "./pixel-art";
import { compileSprite } from "./pixel-grid";
export type PixelPose =
  "idle" | "cheer" | "encourage" | "thinking" | "celebrate";
/** Every pose keeps the supplied head. Only sleeves, hands and the jump offset change. */
export function mascotGrid(pose: PixelPose) {
  const cells = Array.from({ length: 28 }, () => Array<string>(28).fill("."));
  const top = pose === "celebrate" ? 3 : 5;
  const put = (x: number, y: number, key: string) => {
    cells[y][x] = key;
  };
  PIXEL_GRIDS.mascotIdle.forEach((row, y) =>
    [...row].forEach((key, x) => put(x + 6, y + top, key)),
  );
  function raised(left: boolean) {
    const x = left ? 3 : 23;
    for (let y = top + 8; y <= top + 10; y++) {
      put(x, y, "S");
      put(x + 1, y, "S");
    }
    for (let y = top + 11; y <= top + 14; y++) {
      put(x, y, "D");
      put(x + 1, y, "M");
    }
    for (let j = 0; j < 4; j++) {
      put(left ? 4 + j : 23 - j, top + 13, "M");
      put(left ? 4 + j : 23 - j, top + 14, "M");
    }
    put(left ? 7 : 20, top + 15, "M");
  }
  if (pose === "cheer" || pose === "celebrate") {
    raised(true);
    raised(false);
  }
  if (pose === "encourage") raised(true);
  if (pose === "thinking") {
    [
      "KKKKKKKKKKK",
      "KWWWWWWWWWK",
      "KWKWWKWWKWK",
      "KWWWWWWWWWK",
      "KKKKKKKKKKK",
    ].forEach((row, y) => [...row].forEach((key, x) => put(x + 16, y, key)));
    put(23, 5, "W");
    put(16, top + 11, "S");
    put(17, top + 11, "S");
    put(18, top + 12, "M");
    put(19, top + 13, "M");
    put(20, top + 14, "D");
    put(20, top + 15, "M");
  }
  return cells.map((row) => row.join(""));
}
export const MASCOT_GRIDS = {
  idle: mascotGrid("idle"),
  cheer: mascotGrid("cheer"),
  encourage: mascotGrid("encourage"),
  thinking: mascotGrid("thinking"),
  celebrate: mascotGrid("celebrate"),
};
export const MASCOT_ART = {
  idle: compileSprite(MASCOT_GRIDS.idle, PIXEL_PALETTES.mascot),
  cheer: compileSprite(MASCOT_GRIDS.cheer, PIXEL_PALETTES.mascot),
  encourage: compileSprite(MASCOT_GRIDS.encourage, PIXEL_PALETTES.mascot),
  thinking: compileSprite(MASCOT_GRIDS.thinking, PIXEL_PALETTES.mascot),
  celebrate: compileSprite(MASCOT_GRIDS.celebrate, PIXEL_PALETTES.mascot),
};
