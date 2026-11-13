import {
  DiagramArrow as Arrow,
  DiagramBox as Box,
} from "./course-diagram-parts";
import { ResponsiveCourseDiagram as Responsive } from "./course-diagram-frame";
import styles from "./course-diagram.module.css";
function Router({ portrait }: { portrait: boolean }) {
  if (portrait)
    return (
      <>
        <Box x={100} y={10} width={120} labels={["Question"]} />
        <Arrow d="M160 50v30" x={160} y={80} angle={90} />
        <Box x={100} y={80} width={120} labels={["Router"]} />
        {[8, 172].map((x, i) => (
          <g key={x}>
            <Arrow
              d={`M160 120v30H${x + 70}v30`}
              x={x + 70}
              y={180}
              angle={90}
            />
            <Box
              x={x}
              y={180}
              width={140}
              height={46}
              labels={[i ? "Large model" : "Small model"]}
              notice={i === 1}
            />
            <text x={x + 70} y={250} textAnchor="middle">
              {i ? "20%, multi-step" : "80% of questions"}
            </text>
            {!i && (
              <text x={x + 70} y={272} textAnchor="middle">
                Fast and cheap
              </text>
            )}
            <Arrow d={`M${x + 70} 284v26H160v30`} x={160} y={340} angle={90} />
          </g>
        ))}
        <Box x={100} y={340} width={120} labels={["Answer"]} />
      </>
    );
  return (
    <>
      <Box x={8} y={75} width={100} labels={["Question"]} />
      <Arrow d="M108 95h32" x={140} y={95} />
      <Box x={140} y={75} width={110} labels={["Router"]} />
      {[25, 125].map((y, i) => (
        <g key={y}>
          <Arrow d={`M250 95h30V${y + 20}h40`} x={320} y={y + 20} />
          <Box
            x={320}
            y={y}
            width={160}
            labels={[i ? "Large model" : "Small model"]}
            notice={i === 1}
          />
          <text x={400} y={y + 58} textAnchor="middle">
            {i ? "20%, multi-step" : "80%, fast and cheap"}
          </text>
          <Arrow d={`M480 ${y + 20}h30V95h42`} x={552} y={95} />
        </g>
      ))}
      <Box x={552} y={75} width={120} labels={["Answer"]} />
    </>
  );
}
export function ModelRouterDiagram() {
  return (
    <Responsive
      label="A router sends eighty percent of questions to a small model and twenty percent to a larger model"
      desktop={<Router portrait={false} />}
      portrait={<Router portrait />}
      portraitHeight={400}
    />
  );
}
export function CitationMark({
  x,
  y,
  valid,
}: {
  x: number;
  y: number;
  valid: boolean;
}) {
  return (
    <path
      className={valid ? styles.good : styles.error}
      d={valid ? "m0 6 6 6 12-15" : "m0-3 14 14m0-14L0 11"}
      transform={`translate(${x} ${y})`}
    />
  );
}
function Citations({ portrait }: { portrait: boolean }) {
  const ax = portrait ? 20 : 12,
    ay = portrait ? 10 : 45,
    aw = portrait ? 280 : 292;
  return (
    <>
      <Box x={ax} y={ay} width={aw} height={96} labels={[]} />
      <text x={ax + 14} y={ay + 31}>
        Refunds take 5 days [1].
      </text>
      <text x={ax + 14} y={ay + 65}>
        All refunds are instant [2].
      </text>
      {[0, 1].map((i) => {
        const x = portrait ? 20 : 414,
          y = portrait ? 170 + i * 115 : 10 + i * 98,
          w = portrait ? 280 : 250;
        return (
          <g key={i}>
            <Arrow
              d={
                portrait
                  ? i
                    ? `M300 75h12V${y - 18}H160v18`
                    : `M90 106V${y - 18}H160v18`
                  : `M304 ${76 + i * 34}h50V${y + 34}h60`
              }
              x={portrait ? 160 : 414}
              y={portrait ? y : y + 34}
              angle={portrait ? 90 : 0}
            />
            <Box
              x={x}
              y={y}
              width={w}
              height={68}
              labels={[]}
              notice={i === 0}
            />
            <CitationMark x={x + 14} y={y + 22} valid={i === 0} />
            <text x={x + 44} y={y + 27}>
              Source [{i + 1}]
            </text>
            <text x={x + 14} y={y + 54}>
              {i ? "Says something else" : "Supports the claim"}
            </text>
          </g>
        );
      })}
    </>
  );
}
export function CitationCheckDiagram() {
  return (
    <Responsive
      label="One cited source supports its claim; the other source says something else and is marked invalid"
      desktop={<Citations portrait={false} />}
      portrait={<Citations portrait />}
      portraitHeight={380}
    />
  );
}
