import {
  DiagramArrow as Arrow,
  DiagramBox as Box,
} from "./course-diagram-parts";
import { ResponsiveCourseDiagram as Responsive } from "./course-diagram-frame";
import styles from "./course-diagram.module.css";
function Angle({ portrait }: { portrait: boolean }) {
  return portrait ? (
    <>
      <path className={styles.line} d="M20 300H300M90 330V20" />
      <Arrow d="M90 300 210 68" x={210} y={68} angle={-63} />
      <Arrow d="M90 300 270 112" x={270} y={112} angle={-46} />
      <Arrow d="M90 300 36 106" x={36} y={106} angle={-106} />
      <path className={styles.goldLine} d="M114 254A52 52 0 0 1 128 265" />
      <text x={206} y={44} textAnchor="middle">
        Refund policy
      </text>
      <text x={222} y={142} textAnchor="middle">
        <tspan x={222}>Get my money</tspan>
        <tspan x={222} dy={20}>
          back
        </tspan>
      </text>
      <text x={68} y={84} textAnchor="middle">
        Office chair
      </text>
      <text x={154} y={294}>
        Small angle
      </text>
    </>
  ) : (
    <>
      <path className={styles.line} d="M30 150H650M170 165V16" />
      <Arrow d="M170 150 410 48" x={410} y={48} angle={-23} />
      <Arrow d="M170 150 470 80" x={470} y={80} angle={-13} />
      <Arrow d="M170 150 80 50" x={80} y={50} angle={-132} />
      <path className={styles.goldLine} d="M229 125A64 64 0 0 1 232 136" />
      <text x={430} y={45}>
        Refund policy
      </text>
      <text x={486} y={86}>
        Get my money back
      </text>
      <text x={24} y={30}>
        Office chair
      </text>
      <text x={250} y={140}>
        Small angle
      </text>
    </>
  );
}
export function VectorAngleDiagram() {
  return (
    <Responsive
      label="Vectors and their angle"
      desktop={<Angle portrait={false} />}
      portrait={<Angle portrait />}
      portraitHeight={360}
    />
  );
}
function Lanes({ portrait }: { portrait: boolean }) {
  if (portrait)
    return (
      <>
        <text x={74} y={18} textAnchor="middle">
          Offline
        </text>
        <text x={246} y={18} textAnchor="middle">
          Each question
        </text>
        <Box x={8} y={30} width={132} labels={["Document"]} />
        <Box x={180} y={30} width={132} labels={["Query"]} />
        <Arrow d="M74 70v28" x={74} y={98} angle={90} />
        <Arrow d="M246 70v28" x={246} y={98} angle={90} />
        <Box x={8} y={98} width={132} labels={["Encoder"]} />
        <Box x={180} y={98} width={132} labels={["Encoder"]} />
        <Arrow d="M74 138v28" x={74} y={166} angle={90} />
        <Arrow d="M246 138v28" x={246} y={166} angle={90} />
        <Box x={8} y={166} width={132} labels={["Vector index"]} notice />
        <Box x={180} y={166} width={132} labels={["Query vector"]} />
        <Arrow d="M74 206v22h86v22" x={160} y={250} angle={90} />
        <Arrow d="M246 206v22h-86v22" x={160} y={250} angle={90} />
        <Box x={92} y={250} width={136} labels={["Similarity"]} />
        <Arrow d="M160 290v28" x={160} y={318} angle={90} />
        <Box x={110} y={318} width={100} labels={["Top k"]} />
      </>
    );
  return (
    <>
      <text x={8} y={18}>
        Offline
      </text>
      <text x={8} y={104}>
        Each question
      </text>
      {[28, 112].map((y, i) => (
        <g key={y}>
          <Box x={8} y={y} width={100} labels={[i ? "Query" : "Document"]} />
          <Arrow d={`M108 ${y + 20}h24`} x={132} y={y + 20} />
          <Box x={132} y={y} width={100} labels={["Encoder"]} />
          <Arrow d={`M232 ${y + 20}h24`} x={256} y={y + 20} />
          <Box
            x={256}
            y={y}
            width={130}
            labels={[i ? "Query vector" : "Vector index"]}
            notice={!i}
          />
          <Arrow d={`M386 ${y + 20}H418V91H448`} x={448} y={91} />
        </g>
      ))}
      <Box x={448} y={70} width={116} height={42} labels={["Similarity"]} />
      <Arrow d="M564 91h32" x={596} y={91} />
      <Box x={596} y={70} width={76} height={42} labels={["Top k"]} />
    </>
  );
}
export function BiEncoderDiagram() {
  return (
    <Responsive
      label="Separate document and query encoders"
      desktop={<Lanes portrait={false} />}
      portrait={<Lanes portrait />}
      portraitHeight={366}
    />
  );
}
