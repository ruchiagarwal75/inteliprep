import {
  DiagramArrow as Arrow,
  DiagramBox as Box,
} from "./course-diagram-parts";
import { ResponsiveCourseDiagram as Responsive } from "./course-diagram-frame";
import styles from "./course-diagram.module.css";
function Buckets({ portrait }: { portrait: boolean }) {
  return (
    <>
      {["Ingest", "Retrieve", "Assemble", "Generate"].map((label, i) => {
        const x = portrait ? 20 : 8 + i * 172,
          y = portrait ? 20 + i * 110 : 24;
        const captions = [
          ["Missing", "content"],
          ["Retrieval", "miss"],
          ["Context", "failure"],
          ["Generation", "failure"],
        ][i];
        return (
          <g key={label}>
            <Box x={x} y={y} width={portrait ? 128 : 148} labels={[label]} />
            {i < 3 && (
              <Arrow
                d={portrait ? `M84 ${y + 40}v70` : `M${x + 148} 44h24`}
                x={portrait ? 84 : x + 172}
                y={portrait ? y + 110 : 44}
                angle={portrait ? 90 : 0}
              />
            )}
            <path
              className={styles.error}
              d="m-6-6 12 12m0-12-12 12"
              transform={`translate(${portrait ? 177 : x + 74} ${portrait ? y + 20 : 84})`}
            />
            {captions.map((caption, n) => (
              <text
                key={caption}
                x={portrait ? 250 : x + 74}
                y={(portrait ? y + 15 : 110) + n * 22}
                textAnchor="middle"
              >
                {caption}
              </text>
            ))}
          </g>
        );
      })}
      <path
        className={styles.keyLine}
        d={portrait ? "M22 410v12h278v-12" : "M8 146v14H672v-14"}
      />
      <text
        x={portrait ? 160 : 340}
        y={portrait ? 454 : 184}
        textAnchor="middle"
      >
        {portrait
          ? "Safety failures can"
          : "Safety failures can start at any stage"}
      </text>
      {portrait && (
        <text x={160} y={478} textAnchor="middle">
          start at any stage
        </text>
      )}
    </>
  );
}
export function FailureBucketsDiagram() {
  return (
    <Responsive
      label="Classify a failure by ingestion, retrieval, context assembly or generation; safety spans all four"
      desktop={<Buckets portrait={false} />}
      portrait={<Buckets portrait />}
      portraitHeight={500}
    />
  );
}
function Injection({ portrait }: { portrait: boolean }) {
  if (portrait)
    return (
      <>
        <text x={70} y={24} textAnchor="middle">
          Direct
        </text>
        <Box x={10} y={40} width={118} labels={["User"]} />
        <Arrow d="M69 80v20" x={69} y={100} angle={90} />
        <Box
          x={10}
          y={100}
          width={145}
          height={64}
          labels={["Ignore your", "rules..."]}
        />
        <Arrow d="M80 164v78h110" x={190} y={242} />
        <Box x={190} y={220} width={120} height={44} labels={["LLM"]} />
        <Box x={10} y={280} width={140} labels={["Attacker"]} notice />
        <Arrow d="M80 320v40" x={80} y={360} angle={90} tone="gold" />
        <Box x={10} y={360} width={140} labels={["Wiki page"]} notice />
        <Arrow d="M80 400v40" x={80} y={440} angle={90} tone="gold" />
        <Box x={10} y={440} width={140} labels={["Retrieval"]} notice />
        <Arrow d="M150 460h100V264" x={250} y={264} angle={-90} tone="gold" />
        <text x={160} y={518} textAnchor="middle">
          Indirect: harder to see
        </text>
      </>
    );
  return (
    <>
      <Box x={12} y={26} width={112} labels={["User"]} />
      <Arrow d="M124 46H520v44h40" x={560} y={90} />
      <text x={305} y={34} textAnchor="middle">
        Direct: ignore your rules...
      </text>
      <Box x={560} y={70} width={110} labels={["LLM"]} />
      <Box x={12} y={128} width={112} labels={["Attacker"]} notice />
      <Arrow d="M124 148h44" x={168} y={148} tone="gold" />
      <Box x={168} y={128} width={112} labels={["Wiki page"]} notice />
      <Arrow d="M280 148h50" x={330} y={148} tone="gold" />
      <Box x={330} y={128} width={120} labels={["Retrieval"]} notice />
      <Arrow d="M450 148h165v-38" x={615} y={110} angle={-90} tone="gold" />
      <text x={300} y={186} textAnchor="middle">
        Indirect: harder to see
      </text>
    </>
  );
}
export function InjectionPathsDiagram() {
  return (
    <Responsive
      label="Direct injection is typed by the user; indirect injection arrives through retrieved content"
      desktop={<Injection portrait={false} />}
      portrait={<Injection portrait />}
      portraitHeight={550}
    />
  );
}
