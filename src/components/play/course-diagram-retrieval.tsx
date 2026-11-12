import {
  DiagramArrow as Arrow,
  DiagramBox as Box,
} from "./course-diagram-parts";
import styles from "./course-diagram.module.css";
export function TwoTowerDiagram() {
  return (
    <svg viewBox="0 0 320 200" aria-hidden="true">
      <Box
        x={10}
        y={12}
        width={128}
        height={72}
        labels={["Query", "encoder"]}
      />
      <Box
        x={182}
        y={12}
        width={128}
        height={72}
        labels={["Document", "encoder"]}
      />
      <Arrow d="M74 84V110L135 150" x={135} y={150} angle={33} />
      <Arrow d="M246 84V110L185 150" x={185} y={150} angle={147} />
      <Box x={94} y={150} width={132} labels={["Dot product"]} notice />
    </svg>
  );
}
const graph = [
  [24, 38],
  [82, 18],
  [132, 56],
  [48, 106],
  [116, 118],
  [82, 66],
];
export function AnnDiagram() {
  return (
    <svg viewBox="0 0 320 190" aria-hidden="true">
      <path
        className={styles.line}
        d="M24 38 82 18 132 56 116 118 48 106 24 38 82 66 132 56M48 106 82 66 116 118M82 18v48"
      />
      {graph.map(([x, y]) => (
        <circle
          key={x + ":" + y}
          className={styles.graphNode}
          cx={x}
          cy={y}
          r="7"
        />
      ))}
      <rect className={styles.notice} x="188" y="20" width="53" height="70" />
      <rect className={styles.node} x="254" y="20" width="53" height="70" />
      <rect className={styles.node} x="221" y="108" width="53" height="42" />
      {[
        [202, 35],
        [224, 40],
        [211, 67],
        [265, 38],
        [294, 66],
        [233, 123],
        [261, 136],
      ].map(([x, y]) => (
        <circle key={x + ":" + y} className={styles.dot} cx={x} cy={y} r="3" />
      ))}
      <text textAnchor="middle" x="78" y="176">
        HNSW graph
      </text>
      <text textAnchor="middle" x="248" y="176">
        IVF clusters
      </text>
      <text textAnchor="middle" x="248" y="105">
        Search nearby
      </text>
    </svg>
  );
}
function Ranking({
  x,
  y,
  title,
  rows,
  notice = false,
}: {
  x: number;
  y: number;
  title: string;
  rows: readonly string[];
  notice?: boolean;
}) {
  return (
    <g>
      <rect
        className={notice ? styles.notice : styles.node}
        x={x}
        y={y}
        width="132"
        height="104"
      />
      <text x={x + 66} y={y + 24} textAnchor="middle">
        {title}
      </text>
      {rows.map((row, index) => (
        <text key={row} x={x + 18} y={y + 48 + index * 22}>
          {index + 1}. {row}
        </text>
      ))}
    </g>
  );
}
export function RrfDiagram() {
  return (
    <svg viewBox="0 0 320 270" aria-hidden="true">
      <Ranking x={8} y={8} title="Keyword" rows={["Doc A", "Doc C", "Doc B"]} />
      <Ranking
        x={180}
        y={8}
        title="Vector"
        rows={["Doc B", "Doc A", "Doc C"]}
      />
      <Arrow d="M74 112V132L120 154" x={120} y={154} angle={26} />
      <Arrow d="M246 112V132L200 154" x={200} y={154} angle={154} />
      <Ranking
        x={94}
        y={154}
        title="RRF rank"
        rows={["Doc A", "Doc B", "Doc C"]}
        notice
      />
    </svg>
  );
}
