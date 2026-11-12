import { StarIcon } from "./game-icons";
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
        <StarIcon key={n} data-earned={n <= count} />
      ))}
    </span>
  );
}
