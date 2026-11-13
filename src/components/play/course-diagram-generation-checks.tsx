import {
  DiagramArrow as Arrow,
  DiagramBox as Box,
} from "./course-diagram-parts";
import { ResponsiveCourseDiagram as Responsive } from "./course-diagram-frame";
import { CitationMark } from "./course-diagram-generation";
import styles from "./course-diagram.module.css";
function Faithfulness({ portrait }: { portrait: boolean }) {
  if (portrait)
    return (
      <>
        <Box x={100} y={8} width={120} labels={["Answer"]} />
        {[85, 145, 205].map((y, i) => (
          <g key={y}>
            <Arrow d={`M100 28H24V${y + 20}h36`} x={60} y={y + 20} />
            <Box
              x={60}
              y={y}
              width={230}
              height={40}
              labels={[`Claim ${i + 1} + cited chunk`]}
            />
            <Arrow
              d={`M290 ${y + 20}h20V280H160v20`}
              x={160}
              y={300}
              angle={90}
            />
          </g>
        ))}
        <Box x={90} y={300} width={140} height={48} labels={["Check"]} notice />
        {[8, 172].map((x, i) => (
          <g key={x}>
            <Arrow
              d={`M160 348v22H${x + 70}v22`}
              x={x + 70}
              y={392}
              angle={90}
            />
            <Box
              x={x}
              y={392}
              width={140}
              height={48}
              labels={[
                i ? "Unsupported" : "Supported",
                i ? "1 claim" : "2 claims",
              ]}
            />
            <CitationMark x={x + 62} y={461} valid={i === 0} />
          </g>
        ))}
        <Arrow d="M242 482v20" x={242} y={502} angle={90} />
        <Box
          x={172}
          y={502}
          width={140}
          height={48}
          labels={["Remove or", "regenerate"]}
        />
      </>
    );
  return (
    <>
      <Box x={8} y={75} width={82} labels={["Answer"]} />
      {[12, 75, 138].map((y, i) => (
        <g key={y}>
          <Arrow d={`M90 95h20V${y + 20}h20`} x={130} y={y + 20} />
          <Box
            x={130}
            y={y}
            width={205}
            height={40}
            labels={[`Claim ${i + 1} + cited chunk`]}
          />
          <Arrow d={`M335 ${y + 20}h18V95h23`} x={376} y={95} />
        </g>
      ))}
      <Box x={376} y={65} width={86} height={60} labels={["Check"]} notice />
      <Arrow d="M462 95h16V40h22" x={500} y={40} />
      <Arrow d="M462 95h16v30h22" x={500} y={125} />
      <Box x={500} y={15} width={170} height={50} labels={["2 supported"]} />
      <CitationMark x={646} y={73} valid />
      <Box x={500} y={100} width={170} height={50} labels={["1 unsupported"]} />
      <CitationMark x={646} y={159} valid={false} />
      <text x={585} y={185} textAnchor="middle">
        Remove or regenerate
      </text>
    </>
  );
}
export function FaithfulnessDiagram() {
  return (
    <Responsive
      label="Each claim and its cited chunk go through a support check; two pass and the unsupported claim is removed or regenerated"
      desktop={<Faithfulness portrait={false} />}
      portrait={<Faithfulness portrait />}
      portraitHeight={570}
    />
  );
}
const stages = [
  ["Rewrite", "300 ms"],
  ["Retrieve", "50 ms"],
  ["Re-rank", "80 ms"],
  ["LLM first token", "400 ms"],
  ["Streaming", "6 s"],
];
function Timeline({ portrait }: { portrait: boolean }) {
  const widths = [116, 80, 80, 160, 214],
    heights = [70, 40, 40, 100, 150];
  return (
    <>
      {stages.map((labels, i) => {
        const offset = (portrait ? heights : widths)
            .slice(0, i)
            .reduce((n, v) => n + v, 0),
          x = portrait ? 32 : 12 + offset,
          y = portrait ? 12 + offset : 64;
        return (
          <g key={i}>
            <rect
              className={styles.node}
              x={x}
              y={y}
              width={portrait ? 42 : widths[i]}
              height={portrait ? heights[i] : 32}
            />
            {i === 4 &&
              Array.from({ length: portrait ? 10 : 14 }, (_, n) => (
                <path
                  key={n}
                  className={styles.line}
                  d={
                    portrait
                      ? `M32 ${y + 8 + n * 14}l42 12`
                      : `M${x + 2 + n * 14} 96l14-32`
                  }
                />
              ))}
            {(portrait && (i === 1 || i === 2)
              ? [labels.join(" ")]
              : labels
            ).map((label, j) => (
              <text
                key={label}
                x={portrait ? 104 : x + widths[i] / 2}
                y={portrait ? y + heights[i] / 2 - 5 + j * 22 : 125 + j * 22}
                textAnchor={portrait ? "start" : "middle"}
              >
                {label}
              </text>
            ))}
          </g>
        );
      })}
      <path
        className={styles.keyLine}
        d={portrait ? "M24 262h60" : "M448 44v62"}
      />
      <text
        x={portrait ? 104 : 448}
        y={portrait ? 256 : 28}
        textAnchor={portrait ? "start" : "middle"}
      >
        First word at 830 ms
      </text>
    </>
  );
}
export function StreamingTimelineDiagram() {
  return (
    <Responsive
      label="Rewrite, retrieval, re-ranking and model startup total eight hundred thirty milliseconds before the first word, then six seconds of streaming"
      desktop={<Timeline portrait={false} />}
      portrait={<Timeline portrait />}
      portraitHeight={440}
    />
  );
}
