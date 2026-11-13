import {
  DiagramArrow as Arrow,
  DiagramBox as Box,
} from "./course-diagram-parts";
import styles from "./course-diagram.module.css";

export function RagAnswerDiagram() {
  const labels = [
    ["Question"],
    ["Search your", "docs"],
    ["Top pieces"],
    ["LLM"],
    ["Answer with", "sources"],
  ];
  return (
    <>
      <svg className={styles.wide} viewBox="0 0 680 114" aria-hidden="true">
        {labels.map((parts, i) => (
          <g key={parts[0]}>
            <Box
              x={8 + i * 136}
              y={28}
              width={120}
              height={60}
              labels={parts}
              notice={i === 2}
            />
            {i < 4 && (
              <Arrow d={`M${128 + i * 136} 58h16`} x={144 + i * 136} y={58} />
            )}
          </g>
        ))}
      </svg>
      <svg className={styles.compact} viewBox="0 0 320 398" aria-hidden="true">
        {labels.map((parts, i) => (
          <g key={parts[0]}>
            <Box
              x={65}
              y={8 + i * 80}
              width={190}
              height={60}
              labels={parts}
              notice={i === 2}
            />
            {i < 4 && (
              <Arrow
                d={`M160 ${68 + i * 80}v20`}
                x={160}
                y={88 + i * 80}
                angle={90}
              />
            )}
          </g>
        ))}
      </svg>
    </>
  );
}

function ModelCard({
  x,
  y,
  embedding,
}: {
  x: number;
  y: number;
  embedding: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <Box
        x={0}
        y={0}
        width={280}
        height={190}
        labels={[]}
        notice={embedding}
      />
      <text x={140} y={30} textAnchor="middle">
        {embedding ? "Embedding model" : "LLM"}
      </text>
      <text x={140} y={76} textAnchor="middle">
        Text
      </text>
      <Arrow d="M140 88v32" x={140} y={120} angle={90} />
      <text x={140} y={152} textAnchor="middle">
        {embedding ? "[0.12, -0.48, 0.91 ...]" : "Text answer"}
      </text>
    </g>
  );
}
export function RagModelsDiagram() {
  return (
    <>
      <svg className={styles.wide} viewBox="0 0 600 206" aria-hidden="true">
        <ModelCard x={4} y={8} embedding />
        <ModelCard x={316} y={8} embedding={false} />
      </svg>
      <svg className={styles.compact} viewBox="0 0 300 416" aria-hidden="true">
        <ModelCard x={10} y={8} embedding />
        <ModelCard x={10} y={216} embedding={false} />
      </svg>
    </>
  );
}

const offline = [["Docs"], ["Chunk"], ["Embed"], ["Vector DB"]];
const online = [
  ["Question"],
  ["Embed"],
  ["Search"],
  ["Prompt"],
  ["LLM"],
  ["Answer"],
];
export function RagTwoPathsDiagram() {
  return (
    <>
      <svg className={styles.wide} viewBox="0 0 680 270" aria-hidden="true">
        <text x={8} y={20}>
          Offline
        </text>
        {offline.map((parts, i) => (
          <g key={parts[0]}>
            <Box
              x={8 + i * 182}
              y={36}
              width={118}
              height={52}
              labels={parts}
              notice={i === 3}
            />
            {i < 3 && (
              <Arrow d={`M${126 + i * 182} 62h64`} x={190 + i * 182} y={62} />
            )}
          </g>
        ))}
        <text x={8} y={176}>
          Online
        </text>
        {online.map((parts, i) => (
          <g key={parts[0]}>
            <Box
              x={8 + i * 112}
              y={192}
              width={98}
              height={52}
              labels={parts}
            />
            {i < 5 && (
              <Arrow d={`M${106 + i * 112} 218h14`} x={120 + i * 112} y={218} />
            )}
          </g>
        ))}
        <Arrow d="M281 192V126H613V88" x={613} y={88} angle={-90} />
      </svg>
      <svg className={styles.compact} viewBox="0 0 320 510" aria-hidden="true">
        <text x={69} y={24} textAnchor="middle">
          Offline
        </text>
        <text x={251} y={24} textAnchor="middle">
          Online
        </text>
        {[offline, online].map((lane, column) =>
          lane.map((parts, i) => (
            <g key={`${column}-${parts[0]}`}>
              <Box
                x={8 + column * 182}
                y={44 + i * 80}
                width={122}
                height={52}
                labels={parts}
                notice={column === 0 && i === 3}
              />
              {i < lane.length - 1 && (
                <Arrow
                  d={`M${69 + column * 182} ${96 + i * 80}v28`}
                  x={69 + column * 182}
                  y={124 + i * 80}
                  angle={90}
                />
              )}
            </g>
          )),
        )}
        <Arrow d="M190 230H160V310H130" x={130} y={310} angle={180} />
      </svg>
    </>
  );
}
