import {
  DiagramArrow as Arrow,
  DiagramBox as Box,
} from "./course-diagram-parts";
import { ResponsiveCourseDiagram as Responsive } from "./course-diagram-frame";
import styles from "./course-diagram.module.css";
function Safety({ portrait }: { portrait: boolean }) {
  if (portrait)
    return (
      <>
        {[
          "Permission filter",
          "Retrieved text",
          "LLM",
          "User confirms",
          "Tools",
          "Output filter",
          "Rendered answer",
        ].map((label, i) => {
          const gate = [0, 3, 5].includes(i),
            y = 12 + i * 74;
          return (
            <g key={label}>
              {i > 0 && (
                <Arrow d={`M160 ${y - 30}v30`} x={160} y={y} angle={90} />
              )}
              <Box
                x={gate ? 40 : 70}
                y={y}
                width={gate ? 240 : 180}
                height={44}
                labels={[label]}
                notice={gate}
              />
            </g>
          );
        })}
      </>
    );
  return (
    <>
      <Box
        x={48}
        y={68}
        width={120}
        height={52}
        labels={["Retrieved", "text"]}
      />
      <Arrow d="M28 94h20" x={48} y={94} />
      <Arrow d="M168 94h44" x={212} y={94} />
      <Box x={212} y={74} width={80} labels={["LLM"]} />
      <Arrow d="M292 94h64" x={356} y={94} />
      <Box x={356} y={74} width={80} labels={["Tools"]} />
      <Arrow d="M436 94h92" x={528} y={94} />
      <Box
        x={528}
        y={68}
        width={140}
        height={52}
        labels={["Rendered", "answer"]}
      />
      {[
        { x: 12, label: ["Permission", "filter"], tx: 70, y: 24 },
        { x: 320, label: ["User", "confirms"], tx: 328, y: 24 },
        { x: 476, label: ["Output", "filter"], tx: 484, y: 149 },
      ].map(({ x, label, tx, y }) => (
        <g key={x}>
          <rect className={styles.notice} x={x} y={64} width={16} height={60} />
          {label.map((t, i) => (
            <text key={t} x={tx} y={y + i * 22} textAnchor="middle">
              {t}
            </text>
          ))}
        </g>
      ))}
    </>
  );
}
export function SafetyGatesDiagram() {
  return (
    <Responsive
      label="Permission checks precede retrieval, users confirm tool actions, and output is filtered before rendering"
      desktop={<Safety portrait={false} />}
      portrait={<Safety portrait />}
      portraitHeight={530}
    />
  );
}
function Rollout({ portrait }: { portrait: boolean }) {
  return (
    <>
      {["1%", "10%", "50%", "100%"].map((label, i) => {
        const x = portrait ? 120 : 8 + i * 198,
          y = portrait ? 12 + i * 162 : 50;
        return (
          <g key={label}>
            <Box
              x={x}
              y={y}
              width={portrait ? 80 : 70}
              height={44}
              labels={[label]}
            />
            {i < 3 && (
              <>
                <Arrow
                  d={portrait ? `M160 ${y + 44}v19` : `M${x + 70} 72h24`}
                  x={portrait ? 160 : x + 94}
                  y={portrait ? y + 63 : 72}
                  angle={portrait ? 90 : 0}
                />
                <path
                  className={styles.notice}
                  d="M0-40 40 0 0 40-40 0Z"
                  transform={`translate(${portrait ? 160 : x + 134} ${portrait ? y + 103 : 72})`}
                />
                <text
                  x={portrait ? 160 : x + 134}
                  y={portrait ? y + 100 : 68}
                  textAnchor="middle"
                >
                  Metrics
                </text>
                <text
                  x={portrait ? 160 : x + 134}
                  y={portrait ? y + 122 : 90}
                  textAnchor="middle"
                >
                  OK?
                </text>
                <Arrow
                  d={portrait ? `M160 ${y + 143}v19` : `M${x + 174} 72h24`}
                  x={portrait ? 160 : x + 198}
                  y={portrait ? y + 162 : 72}
                  angle={portrait ? 90 : 0}
                />
                <Arrow
                  d={
                    portrait
                      ? `M200 ${y + 103}h90V602h-30`
                      : `M${x + 134} 112v18H340v16`
                  }
                  x={portrait ? 260 : 340}
                  y={portrait ? 602 : 146}
                  angle={portrait ? 180 : 90}
                  tone="wrong"
                />
              </>
            )}
          </g>
        );
      })}
      <Box
        x={portrait ? 70 : 238}
        y={portrait ? 580 : 146}
        width={portrait ? 190 : 204}
        height={44}
        labels={["Rollback"]}
      />
    </>
  );
}
export function SafeRolloutDiagram() {
  return (
    <Responsive
      label="Roll out to one, ten, fifty and one hundred percent only after metric gates pass; failures roll back"
      desktop={<Rollout portrait={false} />}
      portrait={<Rollout portrait />}
      portraitHeight={650}
    />
  );
}
