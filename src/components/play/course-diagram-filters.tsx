import {
  DiagramArrow as Arrow,
  DiagramBox as Box,
} from "./course-diagram-parts";
import { ResponsiveCourseDiagram as Responsive } from "./course-diagram-frame";
import styles from "./course-diagram.module.css";
function Filters({ portrait }: { portrait: boolean }) {
  if (portrait)
    return (
      <>
        <text x={160} y={18} textAnchor="middle">
          Filter after
        </text>
        <path className={styles.node} d="M20 32h280l-56 58H76Z" />
        <text x={160} y={62} textAnchor="middle">
          Top 10
        </text>
        <Arrow d="M160 90v20" x={160} y={110} angle={90} />
        <Box x={108} y={110} width={104} labels={["Filter"]} />
        <Arrow d="M160 150v20" x={160} y={170} angle={90} />
        <Box x={85} y={170} width={150} labels={["1 result"]} />
        <path className={styles.error} d="m250 181 16 16m0-16-16 16" />
        <text x={160} y={244} textAnchor="middle">
          Filter during
        </text>
        <path className={styles.node} d="M20 258h280l-50 58H70Z" />
        <text x={160} y={290} textAnchor="middle">
          Search with filter
        </text>
        <Arrow d="M160 316v24" x={160} y={340} angle={90} />
        <Box x={75} y={340} width={170} labels={["10 results"]} notice />
      </>
    );
  return (
    <>
      <text x={157} y={18} textAnchor="middle">
        Filter after
      </text>
      <text x={505} y={18} textAnchor="middle">
        Filter during
      </text>
      <path className={styles.node} d="M25 35h265l-30 37H55Z" />
      <text x={157} y={60} textAnchor="middle">
        Top 10
      </text>
      <Arrow d="M157 72v13" x={157} y={85} angle={90} />
      <Box x={105} y={85} width={104} height={36} labels={["Filter"]} />
      <Arrow d="M157 121v16" x={157} y={137} angle={90} />
      <Box x={99} y={137} width={116} height={36} labels={["1 result"]} />
      <path className={styles.error} d="m234 147 16 16m0-16-16 16" />
      <path className={styles.node} d="M365 35h280l-46 86H411Z" />
      <text x={505} y={78} textAnchor="middle">
        Search with filter
      </text>
      <Arrow d="M505 121v16" x={505} y={137} angle={90} />
      <Box
        x={430}
        y={137}
        width={150}
        height={36}
        labels={["10 results"]}
        notice
      />
    </>
  );
}
export function FilterTimingDiagram() {
  return (
    <Responsive
      label="Filtering after retrieval versus during retrieval"
      desktop={<Filters portrait={false} />}
      portrait={<Filters portrait />}
      portraitHeight={396}
    />
  );
}
