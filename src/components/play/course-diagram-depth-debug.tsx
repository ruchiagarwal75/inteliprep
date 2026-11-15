import { ResponsiveCourseDiagram as Frame } from "./course-diagram-frame";
import {
  DiagramArrow as Arrow,
  DiagramBox as Box,
} from "./course-diagram-parts";

export function RetrievalDebugCaseDiagram() {
  const stages = [
    ["Current source", "policy-7, v12"],
    ["Indexed chunk", "Present"],
    ["Candidate rank 37", "Cutoff: top 20"],
    ["Final prompt", "Evidence missing"],
  ];
  return (
    <Frame
      label="The evidence exists in the index but is dropped by the candidate cutoff before reaching the prompt."
      portraitHeight={370}
      desktop={
        <>
          {stages.map((labels, i) => (
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
            Fix the first boundary that drops the required evidence.
          </text>
        </>
      }
      portrait={
        <>
          {stages.map((labels, i) => (
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

export function EvaluationCaseDiagram() {
  const stages = [
    ["10 questions", "All answerable"],
    ["8 indexed", "2 ingestion misses"],
    ["6 retrieved", "2 search misses"],
    ["5 supported", "1 generation miss"],
  ];
  return (
    <Frame
      label="Five supported answers out of ten questions means 50 percent end-to-end success, even though generation succeeds on five of six retrieved cases."
      portraitHeight={410}
      desktop={
        <>
          {stages.map((labels, i) => (
            <g key={labels[0]}>
              <Box
                x={8 + i * 170}
                y={36}
                width={152}
                height={80}
                labels={labels}
                notice={i === 3}
              />
              {i < 3 && (
                <Arrow d={`M${160 + i * 170} 76h18`} x={178 + i * 170} y={76} />
              )}
            </g>
          ))}
          <text x={340} y={158} textAnchor="middle">
            End to end: 5/10 = 50%. Given evidence: 5/6 = 83%.
          </text>
        </>
      }
      portrait={
        <>
          {stages.map((labels, i) => (
            <g key={labels[0]}>
              <Box
                x={35}
                y={8 + i * 92}
                width={250}
                height={64}
                labels={labels}
                notice={i === 3}
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
          <text x={160} y={394} textAnchor="middle">
            End to end: 5/10 = 50%
          </text>
        </>
      }
    />
  );
}
