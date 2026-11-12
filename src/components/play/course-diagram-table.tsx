import styles from "./course-diagram.module.css";
function TableExample({
  x,
  y,
  fixed,
}: {
  x: number;
  y: number;
  fixed: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <text textAnchor="middle" x="150" y="20">
        {fixed ? "Keep the header" : "Split without the header"}
      </text>
      <rect className={styles.node} x="30" y="40" width="240" height="76" />
      <path className={styles.line} d="M30 78h240M150 40v38" />
      <text x="90" y="65" textAnchor="middle">
        Plan
      </text>
      <text x="210" y="65" textAnchor="middle">
        Price
      </text>
      <text x="150" y="103" textAnchor="middle">
        Rows
      </text>
      <path className={styles.line} strokeDasharray="5 5" d="M20 130h260" />
      <rect
        className={styles.node}
        x="30"
        y="144"
        width="240"
        height={fixed ? 76 : 38}
      />
      {fixed ? (
        <>
          <rect
            className={styles.notice}
            x="30"
            y="144"
            width="240"
            height="38"
          />
          <path className={styles.line} d="M150 144v38" />
          <text x="90" y="169" textAnchor="middle">
            Plan
          </text>
          <text x="210" y="169" textAnchor="middle">
            Price
          </text>
          <text x="150" y="207" textAnchor="middle">
            Rows
          </text>
        </>
      ) : (
        <>
          <text x="150" y="169" textAnchor="middle">
            Rows
          </text>
          <path className={styles.error} d="M138 198l24 24m0-24-24 24" />
        </>
      )}
    </g>
  );
}
export function SplitTableDiagram() {
  return (
    <>
      <svg className={styles.wide} viewBox="0 0 640 250" aria-hidden="true">
        <TableExample x={0} y={0} fixed={false} />
        <TableExample x={330} y={0} fixed />
      </svg>
      <svg className={styles.compact} viewBox="0 0 320 500" aria-hidden="true">
        <TableExample x={10} y={0} fixed={false} />
        <TableExample x={10} y={250} fixed />
      </svg>
    </>
  );
}
