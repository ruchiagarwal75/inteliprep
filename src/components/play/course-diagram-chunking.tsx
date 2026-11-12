import {
  DiagramArrow as Arrow,
  DiagramBox as Box,
} from "./course-diagram-parts";
import styles from "./course-diagram.module.css";
const pipeline = [
  ["Connect"],
  ["Parse"],
  ["Clean"],
  ["Chunk"],
  ["Enrich"],
  ["Embed +", "index"],
];
export function PipelineDiagram() {
  return (
    <>
      <svg className={styles.wide} viewBox="0 0 680 120" aria-hidden="true">
        {pipeline.map((labels, index) => (
          <g key={labels[0]}>
            <Box
              x={8 + index * 114}
              y={28}
              width={94}
              height={60}
              labels={labels}
              notice={index === 3}
            />
            {index < 5 && (
              <Arrow
                d={`M${102 + index * 114} 58h20`}
                x={122 + index * 114}
                y={58}
              />
            )}
          </g>
        ))}
      </svg>
      <svg className={styles.compact} viewBox="0 0 320 204" aria-hidden="true">
        {pipeline.map((labels, index) => (
          <g key={labels[0]}>
            <Box
              x={4 + (index % 3) * 110}
              y={index < 3 ? 8 : 136}
              width={92}
              height={60}
              labels={labels}
              notice={index === 3}
            />
            {index % 3 < 2 && (
              <Arrow
                d={`M${96 + (index % 3) * 110} ${index < 3 ? 38 : 166}h18`}
                x={114 + (index % 3) * 110}
                y={index < 3 ? 38 : 166}
              />
            )}
          </g>
        ))}
        <Arrow d="M270 68V102H50V136" x={50} y={136} angle={90} />
      </svg>
    </>
  );
}
export function OverlapDiagram() {
  return (
    <svg viewBox="0 0 320 280" aria-hidden="true">
      <Box x={8} y={20} width={304} labels={["Document"]} />
      <Arrow d="M60 60V88" x={60} y={88} angle={90} />
      <Arrow d="M160 60V138" x={160} y={138} angle={90} />
      <Arrow d="M264 60V188" x={264} y={188} angle={90} />
      <rect className={styles.node} x="8" y="88" width="144" height="38" />
      <rect className={styles.node} x="116" y="138" width="144" height="38" />
      <rect className={styles.node} x="224" y="188" width="88" height="38" />
      <rect className={styles.notice} x="116" y="88" width="36" height="38" />
      <rect className={styles.notice} x="116" y="138" width="36" height="38" />
      <rect className={styles.notice} x="224" y="138" width="36" height="38" />
      <rect className={styles.notice} x="224" y="188" width="36" height="38" />
      <text x="20" y="113">
        Chunk A
      </text>
      <text x="163" y="163">
        B
      </text>
      <text x="276" y="213">
        C
      </text>
      <text x="160" y="260" textAnchor="middle">
        Gold repeats boundary text
      </text>
    </svg>
  );
}
export function SmallToBigDiagram() {
  return (
    <svg viewBox="0 0 320 248" aria-hidden="true">
      <rect className={styles.node} x="8" y="20" width="190" height="188" />
      <text x="103" y="48" textAnchor="middle">
        Parent section
      </text>
      <path
        className={styles.line}
        d="M24 70h152M24 84h134M24 170h152M24 184h126"
      />
      <Box
        x={24}
        y={102}
        width={154}
        height={44}
        labels={["Small chunk"]}
        notice
      />
      <Arrow d="M178 124H224" x={224} y={124} />
      <Box x={224} y={104} width={88} labels={["Search"]} />
      <Arrow d="M198 196H224" x={224} y={196} />
      <Box x={224} y={176} width={88} labels={["LLM"]} />
      <text x="160" y="238" textAnchor="middle">
        Match small, send the parent
      </text>
    </svg>
  );
}
