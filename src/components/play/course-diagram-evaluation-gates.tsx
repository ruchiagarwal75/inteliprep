import {
  DiagramArrow as Arrow,
  DiagramBox as Box,
} from "./course-diagram-parts";
import { ResponsiveCourseDiagram as Responsive } from "./course-diagram-frame";
import styles from "./course-diagram.module.css";
function Judge({ portrait }: { portrait: boolean }) {
  if (portrait)
    return (
      <>
        <Box
          x={20}
          y={10}
          width={280}
          height={56}
          labels={["Question + context", "+ answer"]}
        />
        <Box x={90} y={88} width={140} labels={["Rubric"]} />
        <Arrow d="M20 38H8v158h82" x={90} y={196} />
        <Arrow d="M160 128v42" x={160} y={170} angle={90} />
        <Box
          x={90}
          y={170}
          width={140}
          height={52}
          notice
          labels={["Judge LLM"]}
        />
        <Arrow d="M160 222v36" x={160} y={258} angle={90} />
        <Box
          x={70}
          y={258}
          width={180}
          height={44}
          labels={["Score + reason"]}
        />
        <Box x={20} y={334} width={136} height={44} labels={["Human labels"]} />
        <Arrow d="M250 280h26v54" x={276} y={334} angle={90} />
        <Arrow d="M156 356h26" x={182} y={356} />
        <Box
          x={182}
          y={334}
          width={130}
          height={56}
          labels={["Agreement", "90%"]}
        />
      </>
    );
  return (
    <>
      <Box
        x={8}
        y={12}
        width={244}
        height={52}
        labels={["Question + context", "+ answer"]}
      />
      <Box x={8} y={118} width={130} labels={["Rubric"]} />
      <Arrow d="M252 38h14v53h18" x={284} y={91} />
      <Arrow d="M138 138h88V99h58" x={284} y={99} />
      <Box
        x={284}
        y={65}
        width={140}
        height={60}
        notice
        labels={["Judge LLM"]}
      />
      <Arrow d="M424 95h30V38h8" x={462} y={38} />
      <Box x={462} y={16} width={204} height={44} labels={["Score + reason"]} />
      <Box x={266} y={142} width={156} height={36} labels={["Human labels"]} />
      <Arrow d="M564 60v73" x={564} y={133} angle={90} />
      <Arrow d="M422 160h78" x={500} y={160} />
      <Box
        x={500}
        y={133}
        width={164}
        height={44}
        labels={["Agreement: 90%"]}
      />
    </>
  );
}
export function JudgeAgreementDiagram() {
  return (
    <Responsive
      label="A rubric guides the judge; human labels check its agreement"
      desktop={<Judge portrait={false} />}
      portrait={<Judge portrait />}
      portraitHeight={420}
    />
  );
}
function Gates({ portrait }: { portrait: boolean }) {
  const metrics = [
    { name: "Recall@10", before: "92%", after: "93%", a: 193, b: 195 },
    { name: "Faithfulness", before: "95%", after: "91%", a: 200, b: 191 },
    { name: "Latency p95", before: "1.2 s", after: "1.2 s", a: 167, b: 167 },
  ];
  return (
    <>
      {metrics.map((m, i) => {
        const y = portrait ? i * 120 + 10 : i * 57 + 4;
        return (
          <g key={m.name}>
            <text x={portrait ? 20 : 8} y={y + 18}>
              {m.name}
            </text>
            <text x={portrait ? 20 : 8} y={y + 40}>
              {m.before} to {m.after}
            </text>
            {[false, true].map((after) => (
              <g key={String(after)}>
                <text
                  x={portrait ? 20 : 245}
                  y={y + (portrait ? (after ? 96 : 68) : after ? 40 : 18)}
                >
                  {after ? "After" : "Before"}
                </text>
                <rect
                  className={after && i === 1 ? styles.badBar : styles.node}
                  x={portrait ? 90 : 325}
                  y={y + (portrait ? (after ? 82 : 54) : after ? 26 : 4)}
                  width={after ? m.b : m.a}
                  height={14}
                />
              </g>
            ))}
          </g>
        );
      })}
      <Box
        x={portrait ? 90 : 560}
        y={portrait ? 376 : 66}
        width={portrait ? 190 : 112}
        height={portrait ? 44 : 54}
        labels={portrait ? ["Gate: blocked"] : ["Gate:", "blocked"]}
        notice
      />
    </>
  );
}
export function RegressionGatesDiagram() {
  return (
    <Responsive
      label="Faithfulness falls from ninety-five to ninety-one percent, blocking the release"
      desktop={<Gates portrait={false} />}
      portrait={<Gates portrait />}
      portraitHeight={440}
    />
  );
}
