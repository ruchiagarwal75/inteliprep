import {
  DiagramArrow as Arrow,
  DiagramBox as Box,
} from "./course-diagram-parts";
import styles from "./course-diagram.module.css";
const pipeline = ["Source", "Parse", "Chunk", "Metadata", "Embed", "Index"];
export function PipelineDiagram() {
  return (
    <>
      <svg className={styles.wide} viewBox="0 0 680 100" aria-hidden="true">
        {pipeline.map((label, index) => (
          <g key={label}>
            <Box
              x={8 + index * 114}
              y={30}
              width={94}
              labels={[label]}
              notice={label === "Chunk"}
            />
            {index < 5 && (
              <Arrow
                d={`M${102 + index * 114} 50h20`}
                x={122 + index * 114}
                y={50}
              />
            )}
          </g>
        ))}
      </svg>
      <svg className={styles.compact} viewBox="0 0 320 160" aria-hidden="true">
        {pipeline.map((label, index) => (
          <g key={label}>
            <Box
              x={4 + (index % 3) * 110}
              y={index < 3 ? 10 : 110}
              width={92}
              labels={[label]}
              notice={label === "Chunk"}
            />
            {index % 3 < 2 && (
              <Arrow
                d={`M${96 + (index % 3) * 110} ${index < 3 ? 30 : 130}h18`}
                x={114 + (index % 3) * 110}
                y={index < 3 ? 30 : 130}
              />
            )}
          </g>
        ))}
        <Arrow d="M270 50V80H50V110" x={50} y={110} angle={90} />
      </svg>
    </>
  );
}
export function OverlapDiagram() {
  return (
    <svg viewBox="0 0 320 168" aria-hidden="true">
      <rect className={styles.node} x="10" y="24" width="190" height="40" />
      <rect className={styles.node} x="130" y="90" width="180" height="40" />
      <rect className={styles.notice} x="130" y="24" width="70" height="40" />
      <rect className={styles.notice} x="130" y="90" width="70" height="40" />
      <path
        className={styles.line}
        strokeDasharray="4 4"
        d="M130 64v26m70-26v26"
      />
      <text x="24" y="49">
        Chunk A
      </text>
      <text x="216" y="115">
        Chunk B
      </text>
      <text textAnchor="middle" x="165" y="159">
        Shared text
      </text>
    </svg>
  );
}
export function SplitTableDiagram() {
  return (
    <svg viewBox="0 0 320 178" aria-hidden="true">
      <rect className={styles.node} x="8" y="22" width="140" height="112" />
      <rect className={styles.node} x="172" y="78" width="140" height="56" />
      <rect className={styles.notice} x="172" y="22" width="140" height="40" />
      <path
        className={styles.line}
        d="M8 50h140M8 78h140M8 106h140M172 106h140M78 22v112M242 78v56"
      />
      <text x="22" y="43">
        Plan
      </text>
      <text x="91" y="43">
        Price
      </text>
      <text textAnchor="middle" x="43" y="100">
        Rows
      </text>
      <text textAnchor="middle" x="207" y="125">
        Rows
      </text>
      <text textAnchor="middle" x="242" y="47">
        No header
      </text>
      <text textAnchor="middle" x="78" y="164">
        Chunk A
      </text>
      <text textAnchor="middle" x="242" y="164">
        Chunk B
      </text>
    </svg>
  );
}
