import {
  EvaluationLayersDiagram,
  ReciprocalRankDiagram,
} from "./course-diagram-evaluation";
import {
  JudgeAgreementDiagram,
  RegressionGatesDiagram,
} from "./course-diagram-evaluation-gates";
import { ServingPathsDiagram, IndexLagDiagram } from "./course-diagram-serving";
import {
  ShardedIndexDiagram,
  DegradationStepsDiagram,
} from "./course-diagram-serving-scale";
import {
  FailureBucketsDiagram,
  InjectionPathsDiagram,
} from "./course-diagram-failure";
import {
  SafetyGatesDiagram,
  SafeRolloutDiagram,
} from "./course-diagram-safety";
/** Teaching diagrams only. Quiz content and grading stay on the server. */
export const RAG_OPERATIONS_DIAGRAMS = {
  "evaluation-layers": {
    art: EvaluationLayersDiagram,
    alt: "A question flows through retrieval, chunks and generation to an answer. Retrieval uses recall@k and MRR; generation uses faithfulness and correctness.",
  },
  "reciprocal-rank": {
    art: ReciprocalRankDiagram,
    alt: "The correct chunk is second in a five-result ranked list, highlighted in gold. Hit@5 is yes and reciprocal rank is one divided by two, or 0.5.",
  },
  "judge-agreement": {
    art: JudgeAgreementDiagram,
    alt: "Question, context, answer and rubric feed a judge LLM highlighted in gold. Its score is compared with human labels, reaching ninety percent agreement.",
  },
  "regression-gates": {
    art: RegressionGatesDiagram,
    alt: "Before and after bars show recall improving from ninety-two to ninety-three percent, faithfulness falling from ninety-five to ninety-one percent in red, and unchanged latency. The gold regression gate blocks release.",
  },
  "serving-paths": {
    art: ServingPathsDiagram,
    alt: "Online clients use a gateway, RAG service, indexes, re-ranker and LLM, with answers streamed back. Offline sources feed a queue and ingestion workers that update the same gold indexes.",
  },
  "index-lag": {
    art: IndexLagDiagram,
    alt: "An edit becomes an event, waits in a queue, is embedded and becomes searchable. A gold bracket measures the whole index lag against a five-minute target.",
  },
  "sharded-index": {
    art: ShardedIndexDiagram,
    alt: "A query router fans out to four index shards, each with a lighter replica behind it. Results merge into the top k highlighted in gold.",
  },
  "degradation-steps": {
    art: DegradationStepsDiagram,
    alt: "A descending staircase starts with a full answer in gold, then no re-ranking, keyword-only search, a backup model and links only as dependencies fail.",
  },
  "failure-buckets": {
    art: FailureBucketsDiagram,
    alt: "Ingest, retrieve, assemble and generate each have a red failure marker: missing content, retrieval miss, context failure and generation failure. A gold bracket shows safety failures can start at any stage.",
  },
  "injection-paths": {
    art: InjectionPathsDiagram,
    alt: "Direct injection goes from a user's instruction to the LLM. The harder-to-see indirect route is highlighted in gold: an attacker edits a wiki page that reaches the LLM through retrieval.",
  },
  "safety-gates": {
    art: SafetyGatesDiagram,
    alt: "Three gold gates protect a RAG flow: permission filtering before retrieval, user confirmation before tools and output filtering before rendering the answer.",
  },
  "safe-rollout": {
    art: SafeRolloutDiagram,
    alt: "A staged rollout grows from one to ten to fifty to one hundred percent. Gold metric gates separate the stages, with red arrows to rollback if any check fails.",
  },
};
