import { PixelSprite } from "./pixel-sprite";
import { PIXEL_ART } from "./pixel-art";
import { compileSprite } from "./pixel-grid";
import styles from "./play.module.css";
// Original 16-cell world emblems. Each mark uses whole grid cells.
const grids = {
  rag: [
    "................",
    "..WWWWWWWWWWW...",
    "..WAAAAAAAAAW...",
    "..WAWAWAWAWAW...",
    "..WAAAAAAAAAW...",
    "..WAWWWWWWAAW...",
    "..WAAAAAAAAAW...",
    "..WAWWWWWAAAW...",
    "..WAAAAAAAAAW...",
    "..WAWWWWWWAAW...",
    "..WAAAAAAAAAW...",
    "..WAWWWWWAAAW...",
    "..WAAAAAAAAAW...",
    "..WWWWWWWWWWW...",
    "................",
    "................",
  ],
  "chat-serving": [
    "................",
    ".WWWWWWWWWWWWWW.",
    ".WAAAAAAAAAAAAW.",
    ".WAAAAAAAAAAAAW.",
    ".WAAAAAAAAAAAAW.",
    ".WAAWAAWAAWAAAW.",
    ".WAAAAAAAAAAAAW.",
    ".WAAAAAAAAAAAAW.",
    ".WAAAAAAAAAAAAW.",
    ".WWWWWWWWWWWWWW.",
    "....WWWW........",
    "....WWW.........",
    "....WW..........",
    "....W...........",
    "................",
    "................",
  ],
  agents: [
    ".....WWWWWW.....",
    ".....WAAAAW.....",
    ".....WAAAAW.....",
    ".....WWWWWW.....",
    ".......WW.......",
    ".......WW.......",
    "...WWWWWWWWWW...",
    "...WW......WW...",
    "...WW......WW...",
    ".WWWWWW..WWWWWW.",
    ".WAAAAW..WAAAAW.",
    ".WAAAAW..WAAAAW.",
    ".WWWWWW..WWWWWW.",
    "................",
    "................",
    "................",
  ],
  "final-loop": [
    "...WW...........",
    "...WWWWWWWWWW...",
    "...WWAAAAAAWW...",
    "...WWAAAAAWW....",
    "...WWAAAAWW.....",
    "...WWAAAAAWW....",
    "...WWAAAAAAWW...",
    "...WWWWWWWWWW...",
    "...WW...........",
    "...WW...........",
    "...WW...........",
    "...WW...........",
    "...WW...........",
    "..WWWW..........",
    "................",
    "................",
  ],
};
const palette = { W: "var(--pixel-sprite-white)", A: "var(--game-world)" };
const icons = Object.fromEntries(
  Object.entries(grids).map(([key, grid]) => [
    key,
    compileSprite(grid, palette),
  ]),
);
export function TopicIcon({
  topic,
  locked,
}: {
  topic: string;
  locked: boolean;
}) {
  return (
    <div className={styles.worldIcon}>
      <PixelSprite art={icons[topic] ?? icons.rag} width="48" height="48" />
      {locked && (
        <span className={styles.lockMark}>
          <PixelSprite art={PIXEL_ART.lock} width="16" height="16" />
        </span>
      )}
    </div>
  );
}
