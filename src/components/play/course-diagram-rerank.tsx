import {
  DiagramArrow as Arrow,
  DiagramBox as Box,
} from "./course-diagram-parts";
import { ResponsiveCourseDiagram as Responsive } from "./course-diagram-frame";

function Encoders({ portrait }: { portrait: boolean }) {
  const right = portrait ? 0 : 370,
    base = portrait ? 230 : 0;
  return (
    <>
      <text x={160} y={22} textAnchor="middle">
        Bi-encoder
      </text>
      {[48, 106].map((y, i) => (
        <g key={y}>
          <Box
            x={8}
            y={y}
            width={72}
            height={32}
            labels={[i ? "Chunk" : "Query"]}
          />
          <Arrow d={`M80 ${y + 16}h16`} x={96} y={y + 16} />
          <Box x={96} y={y} width={96} height={32} labels={["Encoder"]} />
          <Arrow d={`M192 ${y + 16}h20`} x={212} y={y + 16} />
          <Box x={212} y={y} width={100} height={32} labels={["Vector"]} />
          <Arrow
            d={`M262 ${y + 32}v${164 - y - 32}H210`}
            x={210}
            y={164}
            angle={180}
          />
        </g>
      ))}
      <Box x={100} y={148} width={110} height={32} labels={["Cosine"]} />
      <text x={right + 155} y={base + 22} textAnchor="middle">
        Cross-encoder
      </text>
      <Box
        x={right + 40}
        y={base + 44}
        width={230}
        height={36}
        labels={["Query + Chunk"]}
      />
      <Arrow
        d={`M${right + 155} ${base + 80}v24`}
        x={right + 155}
        y={base + 104}
        angle={90}
      />
      <Box
        x={right + 100}
        y={base + 104}
        width={110}
        height={36}
        labels={["Encoder"]}
        notice
      />
      <Arrow
        d={`M${right + 155} ${base + 140}v16`}
        x={right + 155}
        y={base + 156}
        angle={90}
      />
      <text x={right + 155} y={base + 178} textAnchor="middle">
        Score 0.91
      </text>
    </>
  );
}
export function EncoderComparisonDiagram() {
  return (
    <Responsive
      label="Bi-encoder compares separate vectors; cross-encoder reads a query and chunk together"
      desktop={<Encoders portrait={false} />}
      portrait={<Encoders portrait />}
      portraitHeight={430}
    />
  );
}
const pipeline = [
  ["1M", "chunks"],
  ["Retrieve"],
  ["100", "candidates"],
  ["Re-rank"],
  ["Top 5"],
  ["LLM"],
];
function RerankFlow({ portrait }: { portrait: boolean }) {
  return (
    <>
      {pipeline.map((labels, i) => {
        const x = portrait ? 60 : 8 + i * 112,
          y = portrait ? 12 + i * 74 : 66,
          width = portrait ? 200 : 104;
        return (
          <g key={i}>
            <Box
              x={x}
              y={y}
              width={width}
              height={48}
              labels={labels}
              notice={i === 3}
            />
            {(i === 1 || i === 3) && (
              <text
                x={portrait ? 260 : x + 52}
                y={y + (portrait ? 66 : 80)}
                textAnchor="middle"
              >
                {i === 1 ? "about 30 ms" : "about 80 ms"}
              </text>
            )}
            {i < 5 && (
              <Arrow
                d={portrait ? `M160 ${y + 48}v26` : `M${x + width} 90h8`}
                x={portrait ? 160 : x + 112}
                y={portrait ? y + 74 : 90}
                angle={portrait ? 90 : 0}
              />
            )}
          </g>
        );
      })}
    </>
  );
}
export function TwoStagePipelineDiagram() {
  return (
    <Responsive
      label="Retrieve one hundred candidates, re-rank them, and send the top five to the LLM"
      desktop={<RerankFlow portrait={false} />}
      portrait={<RerankFlow portrait />}
      portraitHeight={450}
    />
  );
}
