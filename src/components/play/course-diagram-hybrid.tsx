import {
  DiagramArrow as Arrow,
  DiagramBox as Box,
} from "./course-diagram-parts";
import { ResponsiveCourseDiagram as Responsive } from "./course-diagram-frame";
import styles from "./course-diagram.module.css";
function RankList({
  x,
  y,
  width = 104,
  rows,
}: {
  x: number;
  y: number;
  width?: number;
  rows: readonly string[];
}) {
  return (
    <g>
      <rect
        className={styles.node}
        x={x}
        y={y}
        width={width}
        height={rows.length * 24 + 12}
      />
      {rows.map((row, i) => (
        <text x={x + 12} y={y + 25 + i * 24} key={row}>
          {i + 1} {row}
        </text>
      ))}
    </g>
  );
}
function Hybrid({ portrait }: { portrait: boolean }) {
  if (portrait)
    return (
      <>
        <Box x={100} y={8} width={120} labels={["Query"]} />
        <Arrow d="M160 48v12H80v16" x={80} y={76} angle={90} />
        <Arrow d="M160 48v12h80v16" x={240} y={76} angle={90} />
        <Box
          x={8}
          y={76}
          width={144}
          height={56}
          labels={["Keyword", "(BM25)"]}
        />
        <Box
          x={168}
          y={76}
          width={144}
          height={56}
          labels={["Dense", "(vectors)"]}
        />
        <Arrow d="M80 132v20" x={80} y={152} angle={90} />
        <Arrow d="M240 132v20" x={240} y={152} angle={90} />
        <RankList
          x={18}
          y={152}
          width={124}
          rows={["Doc A", "Doc C", "Doc B"]}
        />
        <RankList x={178} y={152} width={124} rows={["Doc B", "Doc A"]} />
        <Arrow d="M80 236v20h80v20" x={160} y={276} angle={90} />
        <Arrow d="M240 212v44h-80v20" x={160} y={276} angle={90} />
        <Box
          x={84}
          y={276}
          width={152}
          height={44}
          labels={["Merge (RRF)"]}
          notice
        />
        <Arrow d="M160 320v24" x={160} y={344} angle={90} />
        <Box x={84} y={344} width={152} labels={["Top results"]} />
      </>
    );
  return (
    <>
      <Box x={8} y={75} width={76} labels={["Query"]} />
      <Arrow d="M84 95h22V40h24" x={130} y={40} />
      <Arrow d="M84 95h22v45h24" x={130} y={140} />
      <Box x={130} y={10} width={160} height={60} labels={["Keyword (BM25)"]} />
      <Box
        x={130}
        y={110}
        width={160}
        height={60}
        labels={["Dense (vectors)"]}
      />
      <Arrow d="M290 40h32" x={322} y={40} />
      <Arrow d="M290 140h32" x={322} y={140} />
      <RankList x={322} y={6} rows={["Doc A", "Doc C", "Doc B"]} />
      <RankList x={322} y={110} rows={["Doc B", "Doc A"]} />
      <Arrow d="M426 48h22v47h18" x={466} y={95} />
      <Arrow d="M426 140h22V95h18" x={466} y={95} />
      <Box
        x={466}
        y={70}
        width={108}
        height={50}
        labels={["Merge", "(RRF)"]}
        notice
      />
      <Arrow d="M574 95h24" x={598} y={95} />
      <Box x={598} y={70} width={74} height={50} labels={["Top", "results"]} />
    </>
  );
}
export function HybridMergeDiagram() {
  return (
    <Responsive
      label="Hybrid keyword and dense retrieval"
      desktop={<Hybrid portrait={false} />}
      portrait={<Hybrid portrait />}
      portraitHeight={400}
    />
  );
}
function Rrf({ portrait }: { portrait: boolean }) {
  const width = portrait ? 96 : 176,
    columns = portrait ? [4, 112, 220] : [8, 252, 496];
  const ys = portrait ? [80, 160, 240] : [44, 80, 116],
    height = portrait ? 52 : 30;
  const ranks = [
    ["Doc A", "Doc C", "Doc B"],
    ["Doc B", "Doc A"],
    ["Doc A", "Doc B", "Doc C"],
  ];
  return (
    <>
      {columns.map((x, col) => (
        <g key={x}>
          <text x={x + width / 2} y={portrait ? 40 : 24} textAnchor="middle">
            {["Keyword", "Dense", "RRF"][col]}
          </text>
          {ranks[col].map((row, i) => (
            <g key={row}>
              <rect
                className={col === 2 && i < 2 ? styles.notice : styles.node}
                x={x}
                y={ys[i]}
                width={width}
                height={height}
              />
              <text
                x={x + width / 2}
                y={ys[i] + height / 2 + 5}
                textAnchor="middle"
              >
                {i + 1} {row}
              </text>
            </g>
          ))}
        </g>
      ))}
      <Arrow
        d={portrait ? "M52 292v32H268v-32" : "M96 146v28h488v-28"}
        x={portrait ? 268 : 584}
        y={portrait ? 292 : 146}
        angle={-90}
      />
      <path
        className={styles.line}
        d={portrait ? "M160 212v112H268" : "M340 110v64h244"}
      />
    </>
  );
}
export function RrfRanksDiagram() {
  return (
    <Responsive
      label="Reciprocal Rank Fusion combines the two lists"
      desktop={<Rrf portrait={false} />}
      portrait={<Rrf portrait />}
      portraitHeight={350}
    />
  );
}
