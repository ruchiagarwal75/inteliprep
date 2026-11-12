import { PixelSprite } from "./pixel-sprite";
import { PIXEL_ART } from "./pixel-art";
import styles from "./world-banner.module.css";
export function WorldBanner({
  title,
  stars,
  levelsPassed,
  totalLevels,
}: {
  title: string;
  stars: number;
  levelsPassed: number;
  totalLevels: number;
}) {
  return (
    <section className={styles.banner} aria-label={`${title} World progress`}>
      <div className={styles.inner}>
        <div className={styles.copy}>
          <h1 data-game-label>{title} World</h1>
          <p>
            Retrieval, permissions and answer quality. Build one skill at a
            time.
          </p>
        </div>
        <div className={styles.stats}>
          <p aria-label={`${stars} / ${totalLevels * 3} stars`}>
            <PixelSprite art={PIXEL_ART.star} width="27" height="21" />
            <span data-game-label>
              {stars}/{totalLevels * 3}
            </span>
          </p>
          <p
            data-game-label
            aria-label={`${levelsPassed} of ${totalLevels} levels passed`}
          >
            {levelsPassed} of {totalLevels} cleared
          </p>
        </div>
      </div>
    </section>
  );
}
