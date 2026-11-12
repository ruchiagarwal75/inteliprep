import { PixelSprite } from "./pixel-sprite";
import { PIXEL_ART } from "./pixel-art";
import styles from "./stars.module.css";
export function Stars({
  count,
  animate = false,
}: {
  count: number;
  animate?: boolean;
}) {
  return (
    <span
      className={styles.stars}
      role="img"
      aria-label={`${count} of 3 stars`}
      data-animate={animate || undefined}
    >
      {[1, 2, 3].map((n) => (
        <span key={n} className={styles.slot} data-earned={n <= count}>
          <PixelSprite art={PIXEL_ART.star} width="27" height="21" />
        </span>
      ))}
    </span>
  );
}
