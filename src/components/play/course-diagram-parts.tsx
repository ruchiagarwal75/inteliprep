import styles from "./course-diagram.module.css";
export function DiagramBox({
  x,
  y,
  width = 96,
  height = 40,
  labels,
  notice = false,
  lineHeight = 20,
}: {
  x: number;
  y: number;
  width?: number;
  height?: number;
  labels: readonly string[];
  notice?: boolean;
  lineHeight?: number;
}) {
  return (
    <g>
      <rect
        data-diagram-box
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
          y={
            y + height / 2 + 5 + (index - (labels.length - 1) / 2) * lineHeight
          }
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
  tone = "normal",
}: {
  d: string;
  x: number;
  y: number;
  angle?: number;
  tone?: "normal" | "gold" | "wrong";
}) {
  return (
    <g
      className={
        tone === "gold"
          ? styles.keyLine
          : tone === "wrong"
            ? styles.error
            : styles.line
      }
    >
      <path d={d} />
      <path
        d="m-7-5 7 5-7 5"
        transform={`translate(${x} ${y}) rotate(${angle})`}
      />
    </g>
  );
}
