import {
  DiagramArrow as Arrow,
  DiagramBox as Box,
} from "./course-diagram-parts";
import { OverlapPortrait, SmallToBigPortrait } from "./course-diagram-chunking";
import styles from "./course-diagram.module.css";
export function OverlapDiagram() {
  return (
    <>
      <svg
        className={styles.landscape}
        viewBox="0 0 680 190"
        aria-hidden="true"
      >
        <Box x={8} y={12} width={664} height={40} labels={["Document"]} />
        {[8, 240, 472].map((x, index) => (
          <g key={x}>
            <Arrow d={`M${x + 100} 52v38`} x={x + 100} y={90} angle={90} />
            <Box x={x} y={90} width={200} height={44} labels={[]} />
            {index > 0 && (
              <rect
                className={styles.notice}
                x={x}
                y={90}
                width={34}
                height={44}
              />
            )}
            {index < 2 && (
              <rect
                className={styles.notice}
                x={x + 166}
                y={90}
                width={34}
                height={44}
              />
            )}
            <text x={x + 100} y={118} textAnchor="middle">
              Chunk {String.fromCharCode(65 + index)}
            </text>
          </g>
        ))}
        <text x={340} y={172} textAnchor="middle">
          Gold repeats boundary text
        </text>
      </svg>
      <div className={styles.portrait}>
        <OverlapPortrait />
      </div>
    </>
  );
}
export function SmallToBigDiagram() {
  return (
    <>
      <svg
        className={styles.landscape}
        viewBox="0 0 680 184"
        aria-hidden="true"
      >
        <Box x={8} y={12} width={410} height={140} labels={[]} />
        <text x={213} y={40} textAnchor="middle">
          Parent section
        </text>
        <path className={styles.line} d="M28 54h360M28 62h320M28 132h320" />
        <Box
          x={28}
          y={76}
          width={150}
          height={40}
          labels={["Small chunk"]}
          notice
        />
        <Arrow d="M178 96h300" x={478} y={96} />
        <Box x={478} y={76} width={174} height={40} labels={["Search"]} />
        <Arrow d="M418 140h60" x={478} y={140} />
        <Box x={478} y={120} width={174} height={40} labels={["LLM"]} />
        <text x={340} y={180} textAnchor="middle">
          Match small, send the parent
        </text>
      </svg>
      <div className={styles.portrait}>
        <SmallToBigPortrait />
      </div>
    </>
  );
}
