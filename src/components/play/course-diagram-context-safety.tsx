import {
  DiagramArrow as Arrow,
  DiagramBox as Box,
} from "./course-diagram-parts";
import { ResponsiveCourseDiagram as Responsive } from "./course-diagram-frame";
import styles from "./course-diagram.module.css";
function Attention({ portrait }: { portrait: boolean }) {
  const left = portrait ? 55 : 90,
    right = portrait ? 290 : 640,
    bottom = portrait ? 300 : 145,
    top = portrait ? 92 : 45;
  return (
    <>
      <text x={portrait ? 10 : 16} y={22}>
        How often the model uses it
      </text>
      <Arrow
        d={`M${left} 42V${bottom}H${right + 10}`}
        x={right + 10}
        y={bottom}
      />
      <path
        data-lesson-curve
        className={styles.line}
        d={
          portrait
            ? "M55 92C110 282 230 282 290 92"
            : "M90 45C195 158 535 158 640 45"
        }
      />
      {[left, right].map((x) => (
        <circle key={x} className={styles.notice} cx={x} cy={top} r={6} />
      ))}
      <text
        data-curve-label
        x={portrait ? 174 : 365}
        y={portrait ? 270 : 106}
        textAnchor="middle"
      >
        Lost in the middle
      </text>
      <text x={left} y={bottom + 25} textAnchor="middle">
        Start
      </text>
      <text x={right} y={bottom + 25} textAnchor="middle">
        End
      </text>
      <text
        x={portrait ? 170 : 365}
        y={portrait ? 357 : 182}
        textAnchor="middle"
      >
        Position of the fact
      </text>
    </>
  );
}
export function LostMiddleDiagram() {
  return (
    <Responsive
      label="A U-shaped curve shows stronger use of facts at the start and end, with weaker use in the middle"
      desktop={<Attention portrait={false} />}
      portrait={<Attention portrait />}
      portraitHeight={380}
    />
  );
}
function Shield({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path className={styles.notice} d="M0 8 20 0 40 8v24L20 49 0 32Z" />
      <path className={styles.line} d="m10 24 7 7 14-17" />
    </g>
  );
}
function Injection({ portrait }: { portrait: boolean }) {
  if (portrait)
    return (
      <>
        <Box
          x={60}
          y={8}
          width={200}
          height={48}
          labels={["Permissions filter"]}
        />
        <Arrow d="M160 56v24" x={160} y={80} angle={90} />
        <Box x={90} y={80} width={140} labels={["Retrieval"]} />
        <Arrow d="M160 120v24" x={160} y={144} angle={90} />
        <Box x={40} y={144} width={240} height={100} labels={[]} />
        <text x={160} y={174} textAnchor="middle">
          {"<doc> Wiki page"}
        </text>
        <text className={styles.badText} x={160} y={203} textAnchor="middle">
          Ignore your instructions...
        </text>
        <Arrow d="M160 244v34" x={160} y={278} angle={90} />
        <Shield x={140} y={278} />
        <text x={160} y={350} textAnchor="middle">
          Treated as data
        </text>
        <Arrow d="M160 356v20" x={160} y={376} angle={90} />
        <Box x={100} y={376} width={120} labels={["LLM"]} />
      </>
    );
  return (
    <>
      <Box
        x={8}
        y={76}
        width={140}
        height={48}
        labels={["Permissions", "filter"]}
      />
      <Arrow d="M148 100h24" x={172} y={100} />
      <Box x={172} y={80} width={110} labels={["Retrieval"]} />
      <Arrow d="M282 100h24" x={306} y={100} />
      <Box x={306} y={50} width={182} height={100} labels={[]} />
      <text x={397} y={77} textAnchor="middle">
        {"<doc> Wiki page"}
      </text>
      <text className={styles.badText} x={397} y={105} textAnchor="middle">
        Ignore your
      </text>
      <text className={styles.badText} x={397} y={128} textAnchor="middle">
        instructions...
      </text>
      <Arrow d="M488 100h70" x={558} y={100} />
      <Shield x={500} y={74} />
      <text x={550} y={170} textAnchor="middle">
        Treated as data
      </text>
      <Box x={558} y={80} width={112} labels={["LLM"]} />
    </>
  );
}
export function InjectionDataDiagram() {
  return (
    <Responsive
      label="Permissions filter retrieval before an injected wiki page reaches the LLM; document text is treated as data"
      desktop={<Injection portrait={false} />}
      portrait={<Injection portrait />}
      portraitHeight={440}
    />
  );
}
