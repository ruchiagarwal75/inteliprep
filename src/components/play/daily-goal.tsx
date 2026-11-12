import styles from "./daily-goal.module.css";
export function DailyGoal({ complete }: { complete?: boolean }) {
  return (
    <span
      className={styles.goal}
      tabIndex={0}
      role="img"
      aria-label={
        complete === undefined
          ? "Daily goal unavailable"
          : `Daily goal: ${complete ? "1 of 1 rounds complete" : "0 of 1 rounds complete"}`
      }
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 8 8"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <rect width="8" height="8" className={styles.frame} />
        <rect
          x="1"
          y="1"
          width="6"
          height="6"
          className={styles.square}
          data-complete={complete || undefined}
        />
      </svg>
      <span role="tooltip" className={styles.tooltip}>
        Daily goal: 1 round
      </span>
    </span>
  );
}
