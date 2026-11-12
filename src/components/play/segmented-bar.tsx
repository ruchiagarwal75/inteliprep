import styles from "./segmented-bar.module.css";
export type BlockState = "empty" | "done" | "correct" | "wrong";
export const filledBlocks = (value: number, max: number, count: number) =>
  Math.min(count, Math.max(0, Math.floor((value / max) * count)));
export function SegmentedBar({
  states,
  label,
  value,
  max,
}: {
  states: readonly BlockState[];
  label: string;
  value: number;
  max: number;
}) {
  return (
    <span
      className={styles.bar}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      style={{
        gridTemplateColumns: `repeat(${states.length}, minmax(0, 1fr))`,
      }}
    >
      {states.map((state, i) => (
        <i key={i} data-pixel-block data-state={state} aria-hidden="true" />
      ))}
    </span>
  );
}
