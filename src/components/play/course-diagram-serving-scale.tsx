import {
  DiagramArrow as Arrow,
  DiagramBox as Box,
} from "./course-diagram-parts";
import { ResponsiveCourseDiagram as Responsive } from "./course-diagram-frame";
import styles from "./course-diagram.module.css";
function Shards({ portrait }: { portrait: boolean }) {
  return (
    <>
      <Box
        x={portrait ? 100 : 8}
        y={portrait ? 10 : 76}
        width={portrait ? 120 : 80}
        labels={["Query"]}
      />
      <Arrow
        d={portrait ? "M160 50v30" : "M88 96h22"}
        x={portrait ? 160 : 110}
        y={portrait ? 80 : 96}
        angle={portrait ? 90 : 0}
      />
      <Box
        x={portrait ? 100 : 110}
        y={portrait ? 80 : 76}
        width={portrait ? 120 : 100}
        labels={["Router"]}
      />
      {[1, 2, 3, 4].map((n) => {
        const x = portrait ? 90 : 250 + (n - 1) * 100,
          y = portrait ? 170 + (n - 1) * 100 : 44,
          w = portrait ? 160 : 86;
        return (
          <g key={n}>
            <Arrow
              d={
                portrait
                  ? `M100 100H25V${y + 20}h65`
                  : `M210 96h20V20H${x + w / 2}v24`
              }
              x={portrait ? 90 : x + w / 2}
              y={portrait ? y + 20 : y}
              angle={portrait ? 0 : 90}
            />
            <rect
              data-diagram-box
              className={styles.replica}
              x={x + 8}
              y={y + 40}
              width={w}
              height={40}
            />
            <text x={x + 8 + w / 2} y={y + 65} textAnchor="middle">
              Replica
            </text>
            <Box x={x} y={y} width={w} height={40} labels={[`Shard ${n}`]} />
            <Arrow
              d={
                portrait
                  ? `M250 ${y + 20}h36V622h-36`
                  : `M${x + w} ${y + 20}h10V142H445v8`
              }
              x={portrait ? 250 : 445}
              y={portrait ? 622 : 150}
              angle={portrait ? 180 : 90}
            />
          </g>
        );
      })}
      <Box
        x={portrait ? 70 : 270}
        y={portrait ? 600 : 150}
        width={portrait ? 180 : 350}
        height={portrait ? 44 : 32}
        labels={["Merge top k"]}
        notice
      />
    </>
  );
}
export function ShardedIndexDiagram() {
  return (
    <Responsive
      label="A router fans a query across four replicated shards and merges the results"
      desktop={<Shards portrait={false} />}
      portrait={<Shards portrait />}
      portraitHeight={680}
    />
  );
}
function Degrade({ portrait }: { portrait: boolean }) {
  const stages = [
    { name: "Full answer", cause: "" },
    { name: "No re-rank", cause: "Re-ranker down" },
    { name: "Keyword only", cause: "Vector search slow" },
    { name: "Backup model", cause: "LLM down" },
    { name: "Links only", cause: "Everything down" },
  ];
  return (
    <>
      {stages.map(({ name, cause }, i) => {
        const x = portrait ? 8 + i * 18 : 8 + i * 138,
          y = portrait ? 10 + i * 100 : 10 + i * 30,
          w = portrait ? 220 : 112,
          labels =
            !portrait && i === 2
              ? ["Keyword", "only"]
              : !portrait && i === 3
                ? ["Backup", "model"]
                : [name],
          height = labels.length > 1 ? 64 : 44,
          captions =
            !portrait && i === 2
              ? ["Vector search", "slow"]
              : !portrait && i === 4
                ? ["Everything", "down"]
                : [cause],
          previousHeight = !portrait && [3, 4].includes(i) ? 64 : 44;
        return (
          <g key={name}>
            {i > 0 && (
              <>
                {captions.map((caption, line) => (
                  <text
                    data-step-label
                    key={caption}
                    x={x + w / 2}
                    y={y - 16 - (captions.length - 1 - line) * 22}
                    textAnchor="middle"
                  >
                    {caption}
                  </text>
                ))}
                <Arrow
                  d={
                    portrait
                      ? `M${x - 18 + w} ${y - 78}h26V${y + 22}h-8`
                      : `M${x - 26} ${y - 30 + previousHeight / 2}h13V${y + height / 2}h13`
                  }
                  x={portrait ? x + w : x}
                  y={y + height / 2}
                  angle={portrait ? 180 : 0}
                />
              </>
            )}
            <Box
              x={x}
              y={y}
              width={w}
              height={height}
              labels={labels}
              lineHeight={22}
              notice={i === 0}
            />
          </g>
        );
      })}
    </>
  );
}
export function DegradationStepsDiagram() {
  return (
    <Responsive
      label="A degraded system steps down from full answers to links instead of failing completely"
      desktop={<Degrade portrait={false} />}
      portrait={<Degrade portrait />}
      portraitHeight={500}
    />
  );
}
