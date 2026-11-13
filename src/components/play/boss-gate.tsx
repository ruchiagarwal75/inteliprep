import { compileSprite } from "./pixel-grid";
import { PixelSprite } from "./pixel-sprite";
const palette = {
  K: "var(--pixel-sprite-plate)",
  V: "var(--pixel-violet-edge)",
  L: "var(--pixel-sprite-outline)",
  G: "var(--pixel-sprite-gold)",
  D: "var(--pixel-locked)",
  W: "var(--pixel-sprite-white)",
};
function gate(open: boolean) {
  const rows = Array.from({ length: 32 }, (_, y) =>
    Array.from({ length: 32 }, (_, x) => {
      if (y < 4)
        return (x >= 2 && x <= 7) ||
          (x >= 12 && x <= 19) ||
          (x >= 24 && x <= 29)
          ? "K"
          : ".";
      if (y >= 30) return x >= 1 && x <= 30 ? "K" : ".";
      if (x < 3 || x > 28) return ".";
      if (y < 9) return y === 4 || y === 8 || x === 3 || x === 28 ? "K" : "V";
      if (x >= 8 && x <= 23) {
        if (x === 8 || x === 23 || y === 9 || y === 29) return "G";
        if (open) return x === 9 || x === 22 ? "G" : "D";
        return x === 10 || y === 11 ? "W" : "G";
      }
      return y % 5 === 0 || x === 3 || x === 28
        ? "K"
        : (x + y) % 3 === 0
          ? "L"
          : "V";
    }).join(""),
  );
  return compileSprite(rows, palette);
}
const gates = { closed: gate(false), open: gate(true) };
/** Shared with the welcome story. Whole-pixel scaling preserves the gate. */
export function BossGate({
  open = false,
  scale = 4,
}: {
  open?: boolean;
  scale?: 1 | 2 | 3 | 4;
}) {
  return (
    <PixelSprite
      art={open ? gates.open : gates.closed}
      width={32 * scale}
      height={32 * scale}
      data-boss-gate={open ? "open" : "closed"}
    />
  );
}
