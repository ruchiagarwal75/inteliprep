import {
  DiagramArrow as Arrow,
  DiagramBox as Box,
} from "./course-diagram-parts";
import { ResponsiveCourseDiagram as Responsive } from "./course-diagram-frame";
import styles from "./course-diagram.module.css";
function Recall({ portrait }: { portrait: boolean }) {
  const ticks = portrait ? [60, 125, 205, 290] : [100, 270, 440, 640],
    bottom = portrait ? 300 : 140;
  return (
    <>
      <text x={portrait ? 44 : 40} y={24}>
        Recall@N
      </text>
      <Arrow
        d={`M${ticks[0]} 45V${bottom}H${ticks[3] + 10}`}
        x={ticks[3] + 10}
        y={bottom}
      />
      <path
        data-lesson-curve
        className={styles.line}
        d={
          portrait
            ? "M60 288C80 200 95 145 125 122S225 96 290 92"
            : "M100 135C140 88 195 55 270 48S500 34 640 32"
        }
      />
      <circle
        className={styles.notice}
        cx={ticks[1]}
        cy={portrait ? 122 : 48}
        r={6}
      />
      <text data-curve-label x={ticks[1] + 14} y={portrait ? 165 : 69}>
        Good N
      </text>
      {ticks.map((x, i) => (
        <g key={x}>
          <path className={styles.line} d={`M${x} ${bottom}v7`} />
          <text x={x} y={bottom + 27} textAnchor="middle">
            {[10, 50, 100, 200][i]}
          </text>
        </g>
      ))}
      <text
        x={portrait ? 175 : 370}
        y={portrait ? 358 : 183}
        textAnchor="middle"
      >
        Candidates re-ranked (N)
      </text>
    </>
  );
}
export function RecallCurveDiagram() {
  return (
    <Responsive
      label="Recall rises quickly and flattens, with the useful bend at fifty candidates"
      desktop={<Recall portrait={false} />}
      portrait={<Recall portrait />}
      portraitHeight={380}
    />
  );
}
const diverse = [
  ["Refund policy"],
  ["Refund FAQ"],
  ["Billing ticket"],
  ["Exceptions page"],
  ["Contractor policy"],
];
function Diversity({ portrait }: { portrait: boolean }) {
  const xs = portrait ? [8, 168] : [26, 366],
    width = portrait ? 144 : 286;
  return (
    <>
      {xs.map((x, col) => (
        <g key={x}>
          <text x={x + width / 2} y={24} textAnchor="middle">
            {col ? "With MMR" : "Without MMR"}
          </text>
          {diverse.map((labels, i) => (
            <Box
              key={i}
              x={x}
              y={portrait ? 48 + i * 72 : 36 + i * 29}
              width={width}
              height={portrait ? 58 : 26}
              labels={
                portrait
                  ? col
                    ? labels[0].split(" ")
                    : ["Refund policy", "(copy)"]
                  : col
                    ? labels
                    : ["Refund policy (copy)"]
              }
              notice={col === 1}
            />
          ))}
        </g>
      ))}
    </>
  );
}
export function MmrDiversityDiagram() {
  return (
    <Responsive
      label="Without MMR the five results repeat one policy; with MMR five different sources remain"
      desktop={<Diversity portrait={false} />}
      portrait={<Diversity portrait />}
      portraitHeight={420}
    />
  );
}
