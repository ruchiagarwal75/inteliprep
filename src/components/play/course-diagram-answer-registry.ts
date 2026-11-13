import {
  EncoderComparisonDiagram,
  TwoStagePipelineDiagram,
} from "./course-diagram-rerank";
import {
  RecallCurveDiagram,
  MmrDiversityDiagram,
} from "./course-diagram-rerank-selection";
import {
  PromptAnatomyDiagram,
  CachedPrefixDiagram,
} from "./course-diagram-context";
import {
  LostMiddleDiagram,
  InjectionDataDiagram,
} from "./course-diagram-context-safety";
import {
  ModelRouterDiagram,
  CitationCheckDiagram,
} from "./course-diagram-generation";
import {
  FaithfulnessDiagram,
  StreamingTimelineDiagram,
} from "./course-diagram-generation-checks";
/** Teaching-only diagrams. No quiz prompts, answers or grading rules. */
export const RAG_ANSWER_DIAGRAMS = {
  "encoder-comparison": {
    art: EncoderComparisonDiagram,
    alt: "A bi-encoder compares separately encoded query and chunk vectors. A cross-encoder reads the pair together and returns one relevance score.",
  },
  "two-stage-pipeline": {
    art: TwoStagePipelineDiagram,
    alt: "One million chunks narrow to one hundred retrieved candidates in about thirty milliseconds. A re-ranker takes about eighty milliseconds and selects the top five for the LLM.",
  },
  "recall-curve": {
    art: RecallCurveDiagram,
    alt: "Recall rises quickly with candidate count and then flattens. A gold point marks the useful bend at fifty candidates, before extra work brings little gain.",
  },
  "mmr-diversity": {
    art: MmrDiversityDiagram,
    alt: "Without MMR, five copies of one refund policy fill the results. With MMR, a policy, FAQ, billing ticket, exceptions page and contractor policy provide diversity.",
  },
  "prompt-anatomy": {
    art: PromptAnatomyDiagram,
    alt: "The context window is divided into system instructions, retrieved context in gold, conversation history, the question and reserved room for the answer.",
  },
  "lost-middle": {
    art: LostMiddleDiagram,
    alt: "A U-shaped curve shows that the model uses facts at the start and end of a prompt more often. Facts in the middle are missed more often.",
  },
  "injection-data": {
    art: InjectionDataDiagram,
    alt: "A permissions filter runs before retrieval. An injected wiki instruction stays inside document data; a gold shield marks that the LLM must treat it as data.",
  },
  "cached-prefix": {
    art: CachedPrefixDiagram,
    alt: "Stable system instructions and examples form the gold cached prefix. Retrieved context, history and the question change after that prefix.",
  },
  "model-router": {
    art: ModelRouterDiagram,
    alt: "A router sends eighty percent of simple questions to a fast, cheap small model and twenty percent of multi-step questions to the larger model highlighted in gold.",
  },
  "citation-check": {
    art: CitationCheckDiagram,
    alt: "Two answer claims point to cited source cards. A green check marks the source supporting its claim; a red cross marks a source that says something else.",
  },
  "faithfulness-check": {
    art: FaithfulnessDiagram,
    alt: "An answer splits into three claims. Each claim and its cited chunk go through a gold check. Two are supported; the unsupported claim is removed or regenerated.",
  },
  "streaming-timeline": {
    art: StreamingTimelineDiagram,
    alt: "Rewrite takes three hundred milliseconds, retrieval fifty, re-ranking eighty and model startup four hundred. The first word appears at eight hundred thirty milliseconds, then streaming takes six seconds.",
  },
};
