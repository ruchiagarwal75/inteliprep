import {
  ResponsiveCourseDiagram as Responsive,
  QueryStar,
} from "./course-diagram-frame";
import styles from "./course-diagram.module.css";
function Hnsw({ portrait }: { portrait: boolean }) {
  const layers = portrait
    ? [
        [
          [90, 38],
          [180, 49],
          [270, 39],
        ],
        Array.from({ length: 6 }, (_, i) => [
          50 + i * 40,
          [120, 130, 116, 127, 120, 130][i],
        ]),
        Array.from({ length: 12 }, (_, i) => [
          50 + (i % 6) * 40,
          206 + Math.floor(i / 6) * 64 + [0, 6, -4, 5, -3, 0][i % 6],
        ]),
      ]
    : [
        [
          [150, 26],
          [350, 36],
          [550, 24],
        ],
        Array.from({ length: 6 }, (_, i) => [
          110 + i * 96,
          [80, 94, 74, 88, 76, 92][i],
        ]),
        Array.from({ length: 12 }, (_, i) => [
          110 + i * 43,
          [142, 156, 134, 148, 136, 158, 144, 132, 155, 139, 152, 145][i],
        ]),
      ];
  const routePoints = [
    layers[0][0],
    layers[0][1],
    layers[1][3],
    layers[1][portrait ? 4 : 5],
    layers[2][10],
    layers[2][11],
  ];
  const route = routePoints
    .map(([x, y], index) => `${index ? "L" : "M"}${x} ${y}`)
    .join(" ");
  const query = portrait ? { x: 286, y: 270 } : { x: 637, y: 145 };
  return (
    <>
      {layers.map((dots, layer) => (
        <g key={layer} data-hnsw-layer={2 - layer}>
          <text
            x={8}
            y={portrait ? [20, 91, 176][layer] : [35, 90, 150][layer]}
          >
            Layer {2 - layer}
          </text>
          {dots.slice(1).map(([x, y], i) => (
            <path
              key={i}
              className={styles.line}
              d={`M${dots[i][0]} ${dots[i][1]}L${x} ${y}`}
            />
          ))}
          {dots.slice(2).map(([x, y], i) => (
            <path
              key={i}
              className={styles.line}
              d={`M${dots[i][0]} ${dots[i][1]}L${x} ${y}`}
            />
          ))}
          {dots.map(([x, y], i) => (
            <circle
              key={i}
              className={styles.graphNode}
              cx={x}
              cy={y}
              r={portrait ? 5 : 6}
            />
          ))}
        </g>
      ))}
      <path className={styles.goldLine} d={route} />
      {[2, 4].map((index) => {
        const from = routePoints[index - 1],
          to = routePoints[index];
        const x = from[0] + (to[0] - from[0]) * 0.7,
          y = from[1] + (to[1] - from[1]) * 0.7;
        const angle =
          (Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI;
        return (
          <path
            key={index}
            className={styles.goldLine}
            d="m-6-4 6 4-6 4"
            transform={`translate(${x} ${y}) rotate(${angle})`}
          />
        );
      })}
      <QueryStar {...query} />
      <text
        x={portrait ? 270 : 634}
        y={portrait ? 312 : 180}
        textAnchor="middle"
      >
        Query
      </text>
    </>
  );
}
export function HnswLayersDiagram() {
  return (
    <Responsive
      label="HNSW search across three graph layers"
      desktop={<Hnsw portrait={false} />}
      portrait={<Hnsw portrait />}
      portraitHeight={330}
    />
  );
}
