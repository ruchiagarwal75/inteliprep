import { ResponsiveCourseDiagram as Frame } from "./course-diagram-frame";
import {
  DiagramArrow as Arrow,
  DiagramBox as Box,
} from "./course-diagram-parts";
import styles from "./course-diagram.module.css";

export function VectorMemoryBudgetDiagram() {
  const steps = [
    ["2M documents", "x 10 chunks"],
    ["20M vectors", "x 768 x 4 bytes"],
    ["61.44 GB", "Raw vectors only"],
    ["122.88 GB", "Two full copies"],
  ];
  return (
    <Frame
      label="A worked float32 estimate excludes text, metadata, index overhead and growth."
      portraitHeight={370}
      desktop={
        <>
          {steps.map((labels, i) => (
            <g key={labels[0]}>
              <Box
                x={8 + i * 170}
                y={48}
                width={152}
                height={80}
                labels={labels}
                notice={i === 2}
              />
              {i < 3 && (
                <Arrow d={`M${160 + i * 170} 88h18`} x={178 + i * 170} y={88} />
              )}
            </g>
          ))}
          <text x={340} y={168} textAnchor="middle">
            Add measured index overhead, metadata and headroom.
          </text>
        </>
      }
      portrait={
        <>
          {steps.map((labels, i) => (
            <g key={labels[0]}>
              <Box
                x={35}
                y={8 + i * 92}
                width={250}
                height={64}
                labels={labels}
                notice={i === 2}
              />
              {i < 3 && (
                <Arrow
                  d={`M160 ${72 + i * 92}v28`}
                  x={160}
                  y={100 + i * 92}
                  angle={90}
                />
              )}
            </g>
          ))}
        </>
      }
    />
  );
}

export function ContextBudgetCaseDiagram() {
  const allocations = [
    { name: "Instructions", value: "1,000", part: 1 },
    { name: "History", value: "3,000", part: 3 },
    { name: "Question + format", value: "1,000", part: 1 },
    { name: "Evidence", value: "9,000", part: 9 },
    { name: "Output reserve", value: "2,000", part: 2 },
  ];
  return (
    <Frame
      label="A 16,000-token window leaves 9,000 tokens for evidence after other reservations."
      portraitHeight={340}
      desktop={
        <>
          <text x={340} y={24} textAnchor="middle">
            Example context limit: 16,000 tokens
          </text>
          {allocations.map((a, i) => {
            const start = allocations
              .slice(0, i)
              .reduce((sum, item) => sum + item.part, 0);
            return (
              <rect
                key={a.name}
                x={20 + start * 40}
                y={44}
                width={a.part * 40}
                height={42}
                className={i === 3 ? styles.notice : styles.node}
              />
            );
          })}
          {allocations.map((a, i) => (
            <text key={a.name} x={20 + i * 132} y={116}>
              <tspan x={20 + i * 132}>{i === 2 ? "Question +" : a.name}</tspan>
              <tspan x={20 + i * 132} dy={24}>
                {i === 2 ? "format: 1,000" : a.value}
              </tspan>
            </text>
          ))}
          <text x={340} y={178} textAnchor="middle">
            Evidence budget: twelve 750-token chunks before margin.
          </text>
        </>
      }
      portrait={
        <>
          <text x={160} y={24} textAnchor="middle">
            16,000-token window
          </text>
          {allocations.map((a, i) => (
            <g key={a.name}>
              <rect
                x={12}
                y={44 + i * 54}
                width={296}
                height={44}
                className={i === 3 ? styles.notice : styles.node}
              />
              <text x={24} y={72 + i * 54}>
                {a.name}
              </text>
              <text x={296} y={72 + i * 54} textAnchor="end">
                {a.value}
              </text>
            </g>
          ))}
        </>
      }
    />
  );
}
