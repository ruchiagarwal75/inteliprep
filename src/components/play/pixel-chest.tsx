import { CHEST_FRAMES } from "./pixel-chest-art";
import { PixelSprite } from "./pixel-sprite";
import styles from "./pixel-sprite.module.css";
export function PixelChest({
  open = false,
  animate = false,
}: {
  open?: boolean;
  animate?: boolean;
}) {
  if (!open)
    return <PixelSprite art={CHEST_FRAMES[0]} width="48" height="56" />;
  return (
    <span className={styles.chest} data-animate={animate || undefined}>
      {animate && (
        <>
          <PixelSprite
            className={styles.closed}
            art={CHEST_FRAMES[0]}
            width="48"
            height="56"
          />
          <PixelSprite
            className={styles.half}
            art={CHEST_FRAMES[1]}
            width="48"
            height="56"
          />
        </>
      )}
      <PixelSprite
        className={styles.open}
        art={CHEST_FRAMES[2]}
        width="48"
        height="56"
      />
    </span>
  );
}
