import styles from "./course-diagram.module.css";
export function DiagramBox({
  x,
  y,
  width = 96,
  height = 40,
  labels,
  notice = false,
}: {
  x: number;
  y: number;
  width?: number;
  height?: number;
  labels: readonly string[];
  notice?: boolean;
}) {
  return (
    <g>
      <rect
        className={notice ? styles.notice : styles.node}
        x={x}
        y={y}
        width={width}
        height={height}
      />
      {labels.map((label, index) => (
        <text
          key={label}
          textAnchor="middle"
          x={x + width / 2}
          y={y + height / 2 + 5 + (index - (labels.length - 1) / 2) * 20}
        >
          {label}
        </text>
      ))}
    </g>
  );
}
export function DiagramArrow({
  d,
  x,
  y,
  angle = 0,
}: {
  d: string;
  x: number;
  y: number;
  angle?: number;
}) {
  return (
    <g className={styles.line}>
      <path d={d} />
      <path
        d="m-7-5 7 5-7 5"
        transform={`translate(${x} ${y}) rotate(${angle})`}
      />
    </g>
  );
}
