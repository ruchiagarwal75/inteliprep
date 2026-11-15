import { ResponsiveCourseDiagram as Frame } from "./course-diagram-frame";
import {
  DiagramArrow as Arrow,
  DiagramBox as Box,
} from "./course-diagram-parts";

export function ChunkBoundaryCaseDiagram() {
  return (
    <Frame
      label="Preserve the worker type and the exclusion in one retrievable chunk."
      portraitHeight={300}
      desktop={
        <>
          <Box
            x={8}
            y={54}
            width={180}
            height={76}
            labels={["Heading", "Contractors"]}
          />
          <Arrow d="M188 92h48" x={236} y={92} />
          <Box
            x={236}
            y={44}
            width={208}
            height={96}
            labels={["One chunk", "Contractors:", "no chair allowance"]}
            notice
          />
          <Arrow d="M444 92h48" x={492} y={92} />
          <Box
            x={492}
            y={54}
            width={180}
            height={76}
            labels={["Supported answer", "Not covered"]}
          />
          <text x={340} y={174} textAnchor="middle">
            The exclusion must travel with the subject.
          </text>
        </>
      }
      portrait={
        <>
          <Box
            x={35}
            y={8}
            width={250}
            height={64}
            labels={["Heading: Contractors"]}
          />
          <Arrow d="M160 72v32" x={160} y={104} angle={90} />
          <Box
            x={35}
            y={104}
            width={250}
            height={80}
            labels={["One chunk", "Contractors:", "no chair allowance"]}
            notice
          />
          <Arrow d="M160 184v32" x={160} y={216} angle={90} />
          <Box
            x={35}
            y={216}
            width={250}
            height={64}
            labels={["Supported answer", "Not covered"]}
          />
        </>
      }
    />
  );
}

export function PermissionRevokeRaceDiagram() {
  return (
    <Frame
      label="A current permission check rejects a stale candidate after access is revoked."
      portraitHeight={388}
      desktop={
        <>
          <Box
            x={8}
            y={20}
            width={180}
            height={60}
            labels={["10:00 revoke", "Policy version 13"]}
          />
          <Arrow d="M188 50h152v48" x={340} y={98} angle={90} />
          <Box
            x={8}
            y={114}
            width={180}
            height={60}
            labels={["Stale index / cache", "Candidate at 10:01"]}
          />
          <Arrow d="M188 144h48" x={236} y={144} />
          <Box
            x={236}
            y={98}
            width={208}
            height={76}
            labels={["Current permission", "check"]}
            notice
          />
          <Arrow d="M444 136h48" x={492} y={136} />
          <Box
            x={492}
            y={104}
            width={180}
            height={64}
            labels={["Denied", "No text to LLM"]}
          />
        </>
      }
      portrait={
        <>
          <Box
            x={35}
            y={8}
            width={250}
            height={64}
            labels={["10:00 access revoked", "Policy version 13"]}
          />
          <Arrow d="M160 72v32" x={160} y={104} angle={90} />
          <Box
            x={35}
            y={104}
            width={250}
            height={64}
            labels={["10:01 stale candidate", "From index or cache"]}
          />
          <Arrow d="M160 168v32" x={160} y={200} angle={90} />
          <Box
            x={35}
            y={200}
            width={250}
            height={64}
            labels={["Current permission check"]}
            notice
          />
          <Arrow d="M160 264v32" x={160} y={296} angle={90} />
          <Box
            x={35}
            y={296}
            width={250}
            height={64}
            labels={["Denied", "No protected text to LLM"]}
          />
        </>
      }
    />
  );
}
