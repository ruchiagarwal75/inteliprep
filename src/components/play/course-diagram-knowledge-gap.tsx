import { ResponsiveCourseDiagram } from "./course-diagram-frame";
import {
  DiagramArrow as Arrow,
  DiagramBox as Box,
} from "./course-diagram-parts";
import styles from "./course-diagram.module.css";

function KnowledgeGap({ portrait }: { portrait: boolean }) {
  return portrait ? (
    <>
      <text x={8} y={16}>
        Illustrative example
      </text>
      <Box
        x={8}
        y={24}
        width={140}
        height={56}
        labels={["What's our", "refund window?"]}
      />
      <Arrow d="M148 52H180" x={180} y={52} />
      <Box
        x={180}
        y={24}
        width={132}
        height={56}
        labels={["LLM", "Training only"]}
      />
      <Arrow d="M246 80V152" x={246} y={152} angle={90} />
      <Box
        x={180}
        y={152}
        width={132}
        height={56}
        labels={["Possible guess", '"30 days."']}
      />
      <Box
        x={8}
        y={152}
        width={140}
        height={56}
        labels={["Private policy", "14 days"]}
        notice
      />
      <path
        className={styles.line}
        strokeDasharray="5 5"
        d="M78 152V120H208V108"
      />
      <Arrow d="M208 92V80" x={208} y={80} angle={-90} />
      <path className={styles.line} d="m202 96 12 8m0-8-12 8" />
      <text x={8} y={108}>
        Not provided
      </text>
    </>
  ) : (
    <>
      <text x={8} y={20}>
        Illustrative example
      </text>
      <Box
        x={8}
        y={40}
        width={188}
        height={62}
        labels={["What's our", "refund window?"]}
      />
      <Arrow d="M196 71H240" x={240} y={71} />
      <Box
        x={240}
        y={40}
        width={176}
        height={62}
        labels={["LLM", "Training only"]}
      />
      <Arrow d="M416 71H460" x={460} y={71} />
      <Box
        x={460}
        y={40}
        width={212}
        height={62}
        labels={["Possible guess", '"30 days."']}
      />
      <Box
        x={218}
        y={134}
        width={220}
        height={52}
        labels={["Current private policy", "14-day refund window"]}
        notice
      />
      <path className={styles.line} strokeDasharray="5 5" d="M328 134V124" />
      <Arrow d="M328 112V102" x={328} y={102} angle={-90} />
      <path className={styles.line} d="m322 114 12 8m0-8-12 8" />
      <text x={352} y={122}>
        Not provided
      </text>
    </>
  );
}

export function RagKnowledgeGapDiagram() {
  return (
    <ResponsiveCourseDiagram
      label="A confident guess cannot replace a missing current policy"
      desktop={<KnowledgeGap portrait={false} />}
      portrait={<KnowledgeGap portrait />}
      portraitHeight={224}
    />
  );
}
