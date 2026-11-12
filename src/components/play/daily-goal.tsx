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
        width="24"
        height="24"
        viewBox="0 0 28 28"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="14" cy="14" r="11" className={styles.track} />
        <circle
          cx="14"
          cy="14"
          r="11"
          pathLength="1"
          className={styles.fill}
          strokeDasharray="1"
          strokeDashoffset={complete ? 0 : 1}
        />
        {complete && <path d="m9 14 3 3 7-7" className={styles.check} />}
      </svg>
      <span role="tooltip" className={styles.tooltip}>
        Daily goal: 1 round
      </span>
    </span>
  );
}
