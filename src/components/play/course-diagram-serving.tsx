import {
  DiagramArrow as Arrow,
  DiagramBox as Box,
} from "./course-diagram-parts";
import { ResponsiveCourseDiagram as Responsive } from "./course-diagram-frame";
import styles from "./course-diagram.module.css";
function Serving({ portrait }: { portrait: boolean }) {
  if (portrait)
    return (
      <>
        <text x={160} y={24} textAnchor="middle">
          Online
        </text>
        {[
          { label: "Client", y: 40 },
          { label: "Gateway", y: 110 },
          { label: "RAG service", y: 180 },
          { label: "Indexes", y: 260 },
          { label: "Re-ranker", y: 330 },
          { label: "LLM", y: 400 },
        ].map(({ label, y }, i) => (
          <g key={label}>
            {i > 0 && (
              <Arrow
                d={`M160 ${[80, 150, 220, 300, 370][i - 1]}V${y}`}
                x={160}
                y={y}
                angle={90}
              />
            )}
            <Box
              x={80}
              y={y}
              width={160}
              labels={[label]}
              notice={label === "Indexes"}
            />
          </g>
        ))}
        <g data-serving-connection="return">
          <Arrow d="M80 420H14V60h66" x={80} y={60} />
        </g>
        <text x={160} y={476} textAnchor="middle">
          Streamed answer
        </text>
        <text x={160} y={518} textAnchor="middle">
          Offline
        </text>
        <Box x={8} y={540} width={88} height={60} labels={["Sources"]} />
        <Arrow d="M96 570h24" x={120} y={570} />
        <Box x={120} y={540} width={80} height={60} labels={["Queue"]} />
        <Arrow d="M200 570h20" x={220} y={570} />
        <Box
          x={220}
          y={540}
          width={92}
          height={60}
          labels={["Ingestion", "workers"]}
          lineHeight={22}
        />
        <g data-serving-connection="ingestion">
          <Arrow d="M266 540V314h-46v-14" x={220} y={300} angle={-90} />
        </g>
      </>
    );
  return (
    <>
      <text x={8} y={22}>
        Online
      </text>
      <Box x={8} y={52} width={78} labels={["Client"]} />
      <Arrow d="M86 72h18" x={104} y={72} />
      <Box x={104} y={52} width={92} labels={["Gateway"]} />
      <Arrow d="M196 72h18" x={214} y={72} />
      <Box x={214} y={52} width={110} labels={["RAG service"]} />
      <Arrow d="M324 72h12V50h14" x={350} y={50} />
      <Box x={350} y={30} width={118} labels={["Indexes"]} notice />
      <Arrow d="M409 70v24" x={409} y={94} angle={90} />
      <Box x={350} y={94} width={118} labels={["Re-ranker"]} />
      <g data-serving-connection="generation">
        <Arrow d="M468 114h66V80h24" x={558} y={80} />
      </g>
      <Box x={558} y={60} width={110} labels={["LLM"]} />
      <g data-serving-connection="return">
        <Arrow d="M612 60V8H78v44" x={78} y={52} angle={90} />
      </g>
      <text x={400} y={24} textAnchor="middle">
        Streamed answer
      </text>
      <text x={8} y={136}>
        Offline
      </text>
      <Box x={16} y={146} width={100} height={36} labels={["Sources"]} />
      <Arrow d="M116 164h32" x={148} y={164} />
      <Box x={148} y={146} width={96} height={36} labels={["Queue"]} />
      <Arrow d="M244 164h31" x={275} y={164} />
      <Box
        x={275}
        y={146}
        width={180}
        height={36}
        labels={["Ingestion workers"]}
      />
      <g data-serving-connection="ingestion">
        <Arrow d="M300 146V106h30V84h36V70" x={366} y={70} angle={-90} />
      </g>
    </>
  );
}
export function ServingPathsDiagram() {
  return (
    <Responsive
      label="Online questions and offline ingestion share the indexes"
      desktop={<Serving portrait={false} />}
      portrait={<Serving portrait />}
      portraitHeight={630}
    />
  );
}
function Lag({ portrait }: { portrait: boolean }) {
  return (
    <>
      {[["Doc", "edited"], ["Event"], ["Queue"], ["Embed"], ["Searchable"]].map(
        (labels, i) => {
          const x = portrait ? 90 : 8 + i * 136,
            y = portrait ? 10 + i * 76 : 62;
          return (
            <g key={labels[0]}>
              <Box
                x={x}
                y={y}
                width={portrait ? 160 : 120}
                height={48}
                labels={labels}
              />
              {i < 4 && (
                <Arrow
                  d={portrait ? `M170 ${y + 48}v28` : `M${x + 120} 86h16`}
                  x={portrait ? 170 : x + 136}
                  y={portrait ? y + 76 : 86}
                  angle={portrait ? 90 : 0}
                />
              )}
            </g>
          );
        },
      )}
      <path
        className={styles.keyLine}
        d={portrait ? "M80 10H55v352h25" : "M8 125v17H672v-17"}
      />
      <text
        x={portrait ? 160 : 340}
        y={portrait ? 404 : 172}
        textAnchor="middle"
      >
        Index lag: target 5 min
      </text>
    </>
  );
}
export function IndexLagDiagram() {
  return (
    <Responsive
      label="Index lag is measured from a document edit until the change is searchable"
      desktop={<Lag portrait={false} />}
      portrait={<Lag portrait />}
      portraitHeight={440}
    />
  );
}
