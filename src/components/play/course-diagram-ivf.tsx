import {
  ResponsiveCourseDiagram as Responsive,
  QueryStar,
} from "./course-diagram-frame";
import styles from "./course-diagram.module.css";
function Ivf({ portrait }: { portrait: boolean }) {
  const centers = portrait
    ? [
        [80, 55],
        [240, 55],
        [80, 150],
        [240, 150],
        [80, 290],
        [240, 290],
      ]
    : [
        [125, 40],
        [300, 40],
        [475, 40],
        [125, 140],
        [300, 140],
        [475, 140],
      ];
  const selected = [4, 5];
  const query = portrait ? { x: 160, y: 235 } : { x: 390, y: 102 };
  const missed = portrait ? { x: 207, y: 184 } : { x: 440, y: 70 };
  return (
    <>
      {centers.map(([x, y], i) => (
        <g
          key={i}
          data-ivf-cluster={i}
          data-scanned={selected.includes(i) || undefined}
        >
          <ellipse
            className={selected.includes(i) ? styles.notice : styles.cluster}
            cx={x}
            cy={y}
            rx={portrait ? 65 : 64}
            ry={portrait ? 44 : 39}
          />
          {[
            [-22, -8],
            [-5, 14],
            [15, -14],
            [24, 16],
          ].map(([dx, dy], j) => (
            <circle
              key={j}
              className={styles.dot}
              cx={x + dx}
              cy={y + dy}
              r={3}
            />
          ))}
          <path
            className={styles.line}
            d={`M${x - 5} ${y}h10M${x} ${y - 5}v10`}
          />
        </g>
      ))}
      <circle className={styles.error} cx={missed.x} cy={missed.y} r={5} />
      <path
        className={styles.line}
        d={portrait ? "M212 188l24 24" : "M446 70h101"}
      />
      <text x={portrait ? 235 : 552} y={portrait ? 222 : 75}>
        Missed
      </text>
      <QueryStar {...query} />
      <text
        x={portrait ? 160 : 390}
        y={portrait ? 218 : 86}
        textAnchor="middle"
      >
        Query
      </text>
      <text
        x={portrait ? 160 : 588}
        y={portrait ? 385 : 145}
        textAnchor="middle"
      >
        nprobe = 2
      </text>
    </>
  );
}
export function IvfClustersDiagram() {
  return (
    <Responsive
      label="IVF searches two of six clusters"
      desktop={<Ivf portrait={false} />}
      portrait={<Ivf portrait />}
      portraitHeight={400}
    />
  );
}
