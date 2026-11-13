import { ResponsiveCourseDiagram as Responsive } from "./course-diagram-frame";
import { DiagramBox as Box } from "./course-diagram-parts";
function Prompt({ portrait, cached }: { portrait: boolean; cached: boolean }) {
  const parts = cached
    ? [
        {
          labels: ["System +", "examples"],
          width: 210,
          height: 74,
          notice: true,
        },
        { labels: ["Context"], width: 170, height: 84, notice: false },
        { labels: ["History"], width: 130, height: 54, notice: false },
        { labels: ["Question"], width: 130, height: 54, notice: false },
      ]
    : [
        { labels: ["System"], width: 90, height: 48, notice: false },
        {
          labels: ["Retrieved", "context"],
          width: 210,
          height: 88,
          notice: true,
        },
        { labels: ["History"], width: 100, height: 48, notice: false },
        { labels: ["Question"], width: 100, height: 48, notice: false },
        {
          labels: ["Room for", "the answer"],
          width: 140,
          height: 66,
          notice: false,
        },
      ];
  return (
    <>
      <text x={portrait ? 160 : 340} y={26} textAnchor="middle">
        {cached ? "Stable prefix, changing context" : "Context window"}
      </text>
      {parts.map((part, i) => {
        const offset = parts
            .slice(0, i)
            .reduce((n, p) => n + (portrait ? p.height : p.width), 0),
          x = portrait ? 40 : 20 + offset,
          y = portrait ? 48 + offset : 72;
        return (
          <Box
            key={i}
            x={x}
            y={y}
            width={portrait ? 240 : part.width}
            height={portrait ? part.height : 66}
            labels={
              cached && portrait && i === 0
                ? ["Cached system", "and examples"]
                : part.labels
            }
            notice={part.notice}
          />
        );
      })}
      {cached && (
        <>
          {!portrait && (
            <text x={125} y={58} textAnchor="middle">
              Cached
            </text>
          )}
          <text
            x={portrait ? 160 : 445}
            y={portrait ? 354 : 164}
            textAnchor="middle"
          >
            Changes every question
          </text>
        </>
      )}
    </>
  );
}
export function PromptAnatomyDiagram() {
  return (
    <Responsive
      label="The context window holds system instructions, retrieved context, history, the question and room for an answer"
      desktop={<Prompt portrait={false} cached={false} />}
      portrait={<Prompt portrait cached={false} />}
      portraitHeight={370}
    />
  );
}
export function CachedPrefixDiagram() {
  return (
    <Responsive
      label="System instructions and examples form the cached prefix; context, history and the question change"
      desktop={<Prompt portrait={false} cached />}
      portrait={<Prompt portrait cached />}
      portraitHeight={380}
    />
  );
}
