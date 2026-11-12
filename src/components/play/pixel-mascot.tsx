import { MASCOT_ART } from "./pixel-mascot-art";
import type { PixelPose } from "./pixel-mascot-art";
import { PIXEL_ART } from "./pixel-art";
import { PixelSprite } from "./pixel-sprite";
import styles from "./pixel-sprite.module.css";
export function PixelMascot({ pose }: { pose: PixelPose }) {
  return (
    <span className={styles.mascot} data-pixel-pose={pose}>
      <PixelSprite art={MASCOT_ART[pose]} width="100%" height="100%" />
      {(pose === "cheer" || pose === "celebrate") && (
        <>
          <PixelSprite
            className={styles.sparkLeft}
            art={PIXEL_ART.sparkle}
            width="15"
            height="15"
          />
          <PixelSprite
            className={styles.sparkRight}
            art={PIXEL_ART.sparkle}
            width="15"
            height="15"
          />
        </>
      )}
    </span>
  );
}
