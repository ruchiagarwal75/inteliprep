import { PixelMascot } from "./pixel-mascot";
import styles from "./pixel-pose-gallery.module.css";
export function PixelPoseGallery() {
  return (
    <section aria-label="Five pixel mascot poses">
      <h1>Sprite studio</h1>
      <p>The supplied character, with four original pose variants.</p>
      <div className={styles.poses}>
        {(["idle", "cheer", "encourage", "thinking", "celebrate"] as const).map(
          (pose) => (
            <figure key={pose}>
              <PixelMascot pose={pose} />
              <figcaption>{pose[0].toUpperCase() + pose.slice(1)}</figcaption>
            </figure>
          ),
        )}
      </div>
    </section>
  );
}
