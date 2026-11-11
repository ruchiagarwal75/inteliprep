import "server-only";
import { drillDefinitionSchema } from "../definition";
export const base = {
  topic: "rag",
  level: 1,
  prompt: "[sample] Explain a retrieval choice.",
  why: "[sample] Check the choice against a test set.",
  sample: true,
  placement: false,
};
export const mathFixture = drillDefinitionSchema.parse({
  ...base,
  id: "sample-math",
  title: "[sample] Vector storage",
  type: "math",
  prompt:
    "[sample] {docs} documents with {chunks} chunks and {dims} dimensions. How many GB?",
  math: {
    parameters: {
      docs: { kind: "range", min: 1000000, max: 20000000, step: 1000000 },
      chunks: { kind: "range", min: 5, max: 20 },
      dims: { kind: "choices", values: [384, 768, 1024, 1536] },
    },
    expression: [
      { param: "docs" },
      { param: "chunks" },
      "multiply",
      { param: "dims" },
      "multiply",
      4,
      "multiply",
      1000000000,
      "divide",
    ],
    formula: "{docs} x {chunks} x {dims} x 4 / 1,000,000,000",
    canonicalUnit: "GB",
    units: [
      { id: "GB", label: "GB", factor: 1 },
      { id: "TB", label: "TB", factor: 1000 },
    ],
    example: {
      parameters: { docs: 5000000, chunks: 10, dims: 768 },
      answer: 153.6,
    },
  },
});
export const spotFixture = drillDefinitionSchema.parse({
  ...base,
  id: "sample-spot",
  title: "[sample] Find the flaw",
  type: "spot_flaw",
  options: [
    "Preserve table headers",
    "Discard table headers",
    "Add a cache",
    "Change the logo",
  ],
  correctIndex: 0,
});
export const probeFixture = drillDefinitionSchema.parse({
  ...base,
  id: "sample-probe",
  title: "[sample] Ask about a reranker",
  type: "pick_probe",
  rubric:
    "Require a question about reranker latency, retrieval recall or measured quality. A generic scale question fails.",
  seniorAnswer:
    "How do you measure whether reranking improves the answer within the latency budget?",
});
export const tradeFixture = drillDefinitionSchema.parse({
  ...base,
  id: "sample-trade",
  title: "[sample] Pick a chunk size",
  type: "tradeoff",
  rubric:
    "Require a clear call, a precision versus context trade-off and an evaluation mechanism.",
  seniorAnswer:
    "Choose short overlapping chunks and expand the matching section; compare recall on labeled questions.",
});
