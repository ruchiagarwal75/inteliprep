import {
  DiagramArrow as Arrow,
  DiagramBox as Box,
} from "./course-diagram-parts";
import { ResponsiveCourseDiagram as Responsive } from "./course-diagram-frame";
function Layers({ portrait }: { portrait: boolean }) {
  const parts = ["Question", "Retrieval", "Chunks", "Generation", "Answer"];
  return (
    <>
      {parts.map((label, i) => {
        const x = portrait ? 70 : [8, 134, 260, 386, 558][i],
          y = portrait ? [10, 92, 208, 290, 420][i] : 62,
          width = portrait ? 180 : i === 3 ? 150 : i === 4 ? 112 : 100;
        return (
          <g key={label}>
            <Box x={x} y={y} width={width} height={40} labels={[label]} />
            {i < 4 && (
              <Arrow
                d={
                  portrait
                    ? `M160 ${y + 40}V${[92, 208, 290, 420][i]}`
                    : `M${x + width} 82H${[134, 260, 386, 558][i]}`
                }
                x={portrait ? 160 : [134, 260, 386, 558][i]}
                y={portrait ? [92, 208, 290, 420][i] : 82}
                angle={portrait ? 90 : 0}
              />
            )}
          </g>
        );
      })}
      <Box
        x={portrait ? 20 : 95}
        y={portrait ? 144 : 137}
        width={portrait ? 280 : 178}
        height={40}
        notice
        labels={["recall@k, MRR"]}
      />
      <Box
        x={portrait ? 20 : 330}
        y={portrait ? 350 : 137}
        width={portrait ? 280 : 260}
        height={40}
        notice
        labels={["faithfulness, correctness"]}
      />
    </>
  );
}
export function EvaluationLayersDiagram() {
  return (
    <Responsive
      label="Retrieval and generation need separate metrics"
      desktop={<Layers portrait={false} />}
      portrait={<Layers portrait />}
      portraitHeight={480}
    />
  );
}
function Ranks({ portrait }: { portrait: boolean }) {
  return (
    <>
      {[1, 2, 3, 4, 5].map((rank) => (
        <Box
          key={rank}
          x={portrait ? 40 : 60}
          y={(portrait ? 20 : 10) + (rank - 1) * (portrait ? 44 : 32)}
          width={240}
          height={portrait ? 36 : 30}
          notice={rank === 2}
          labels={[`${rank}. ${rank === 2 ? "Right chunk" : "Other chunk"}`]}
        />
      ))}
      <text
        x={portrait ? 160 : 490}
        y={portrait ? 280 : 70}
        textAnchor="middle"
      >
        Hit@5: yes
      </text>
      <text
        x={portrait ? 160 : 490}
        y={portrait ? 320 : 110}
        textAnchor="middle"
      >
        Reciprocal rank
      </text>
      <text
        x={portrait ? 160 : 490}
        y={portrait ? 352 : 145}
        textAnchor="middle"
      >
        1 / 2 = 0.5
      </text>
    </>
  );
}
export function ReciprocalRankDiagram() {
  return (
    <Responsive
      label="The first relevant chunk is second, so reciprocal rank is one half"
      desktop={<Ranks portrait={false} />}
      portrait={<Ranks portrait />}
      portraitHeight={390}
    />
  );
}
