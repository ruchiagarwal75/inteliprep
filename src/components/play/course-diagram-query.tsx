import {
  DiagramArrow as Arrow,
  DiagramBox as Box,
} from "./course-diagram-parts";
import { ResponsiveCourseDiagram as Responsive } from "./course-diagram-frame";
import styles from "./course-diagram.module.css";
function MultiQuery({ portrait }: { portrait: boolean }) {
  if (portrait)
    return (
      <>
        <Box x={100} y={8} width={120} labels={["Question"]} />
        <Arrow d="M160 48v22" x={160} y={70} angle={90} />
        <Box x={100} y={70} width={120} height={48} labels={["LLM rewrite"]} />
        {[4, 112, 220].map((x, i) => (
          <g key={x}>
            <Arrow
              d={`M160 118v18H${x + 48}v16`}
              x={x + 48}
              y={152}
              angle={90}
            />
            <Box
              x={x}
              y={152}
              width={96}
              height={36}
              labels={[`Query ${i + 1}`]}
            />
            <Arrow d={`M${x + 48} 188v32`} x={x + 48} y={220} angle={90} />
            <Box x={x} y={220} width={96} height={36} labels={["Search"]} />
            <Arrow d={`M${x + 48} 256v26H160v28`} x={160} y={310} angle={90} />
          </g>
        ))}
        <Box
          x={84}
          y={310}
          width={152}
          height={48}
          labels={["RRF merge"]}
          notice
        />
        <Arrow d="M160 358v32" x={160} y={390} angle={90} />
        <Box x={84} y={390} width={152} labels={["Results"]} />
      </>
    );
  return (
    <>
      <Box x={8} y={77} width={82} labels={["Question"]} />
      <Arrow d="M90 97h22" x={112} y={97} />
      <Box x={112} y={70} width={102} height={54} labels={["LLM", "rewrite"]} />
      {[8, 78, 148].map((y, i) => (
        <g key={y}>
          <Arrow d={`M214 97h16V${y + 16}h16`} x={246} y={y + 16} />
          <Box
            x={246}
            y={y}
            width={84}
            height={32}
            labels={[`Query ${i + 1}`]}
          />
          <Arrow d={`M330 ${y + 16}h24`} x={354} y={y + 16} />
          <Box x={354} y={y} width={84} height={32} labels={["Search"]} />
          <Arrow d={`M438 ${y + 16}h22V97h24`} x={484} y={97} />
        </g>
      ))}
      <Box
        x={484}
        y={70}
        width={100}
        height={54}
        labels={["RRF", "merge"]}
        notice
      />
      <Arrow d="M584 97h26" x={610} y={97} />
      <Box x={610} y={77} width={62} labels={["Results"]} />
    </>
  );
}
export function MultiQueryDiagram() {
  return (
    <Responsive
      label="Multi-query searches run in parallel"
      desktop={<MultiQuery portrait={false} />}
      portrait={<MultiQuery portrait />}
      portraitHeight={446}
    />
  );
}
function Funnel({ portrait }: { portrait: boolean }) {
  const widths = portrait ? [300, 250, 200, 160] : [650, 500, 350, 200],
    center = portrait ? 160 : 340;
  const ys = portrait ? [10, 108, 206, 304] : [8, 50, 92, 134],
    height = portrait ? 60 : 32;
  return (
    <>
      {widths.map((width, i) => {
        const x = center - width / 2,
          y = ys[i],
          labels = portrait
            ? [
                ["1M chunks"],
                ["100 candidates", "Retrieve"],
                ["10", "Re-rank"],
                ["5 in the", "prompt"],
              ][i]
            : [["1M chunks"], ["100 candidates"], ["10"], ["5 in the prompt"]][
                i
              ];
        return (
          <g key={i}>
            <path
              className={i === 3 ? styles.notice : styles.node}
              d={`M${x} ${y}h${width}l-20 ${height}H${x + 20}Z`}
            />
            {labels.map((label, j) => (
              <text
                key={label}
                x={center}
                y={y + height / 2 + 5 + (j - (labels.length - 1) / 2) * 20}
                textAnchor="middle"
              >
                {label}
              </text>
            ))}
            {i < 3 && (
              <Arrow
                d={`M${center} ${y + height}V${ys[i + 1]}`}
                x={center}
                y={ys[i + 1]}
                angle={90}
              />
            )}
          </g>
        );
      })}
      {!portrait && (
        <>
          <text x={620} y={72} textAnchor="middle">
            Retrieve
          </text>
          <text x={575} y={114} textAnchor="middle">
            Re-rank
          </text>
        </>
      )}
    </>
  );
}
export function RetrievalFunnelDiagram() {
  return (
    <Responsive
      label="Retrieval narrows the candidate set"
      desktop={<Funnel portrait={false} />}
      portrait={<Funnel portrait />}
      portraitHeight={380}
    />
  );
}
