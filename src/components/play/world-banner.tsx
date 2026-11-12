import { GameGuide } from "./game-guide";
import { StarIcon } from "./game-icons";
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
      <div className={styles.copy}>
        <h1>{title} World</h1>
        <div className={styles.stats}>
          <p>
            <StarIcon /> {stars} / {totalLevels * 3} stars
          </p>
          <p>
            {levelsPassed} of {totalLevels} levels passed
          </p>
        </div>
      </div>
      <div className={styles.mascot}>
        <GameGuide />
      </div>
    </section>
  );
}
