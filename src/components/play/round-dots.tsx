import styles from "./round-dots.module.css";
export function RoundDots({
  total,
  current,
  outcomes = [],
}: {
  total: number;
  current: number;
  outcomes?: readonly (boolean | null)[];
}) {
  return (
    <ol className={styles.dots} aria-label="Round progress">
      {Array.from({ length: total }, (_, index) => {
        const outcome = outcomes[index],
          state =
            outcome === true
              ? "correct"
              : outcome === false
                ? "wrong"
                : index === current
                  ? "current"
                  : "pending";
        const label =
          state === "correct"
            ? "Correct"
            : state === "wrong"
              ? "Not quite"
              : state === "current"
                ? "Current drill"
                : "Not answered";
        return (
          <li
            key={index}
            className={styles.dot}
            data-state={state}
            aria-label={`Drill ${index + 1}: ${label}`}
            aria-current={state === "current" ? "step" : undefined}
          />
        );
      })}
    </ol>
  );
}
