import "server-only";
import { drillDefinitionSchema } from "../definition";
// TODO: Replace every Level 3 and 4 sample with reviewed author-supplied content.
export const sampleDrills = [3, 4].flatMap((level) => {
  const permission = level === 3;
  const base = {
    topic: "rag",
    level,
    sample: true,
    gapId: permission ? "rag-permissions" : "rag-quality-safety",
  };
  return [
    {
      ...base,
      id: `rag-l${level}-sample-01`,
      title: "[sample] Check a budget",
      type: "math",
      placement: true,
      prompt: permission
        ? "[sample] A permission update takes {sync} seconds to sync and {apply} seconds to apply. What is the total delay?"
        : "[sample] An eval set has {passed} passing answers out of {total}. What percentage pass?",
      why: permission
        ? "[sample] Include both sync and application time in the revocation budget."
        : "[sample] Divide passing answers by all answers before converting to a percentage.",
      math: {
        parameters: permission
          ? {
              sync: { kind: "range", min: 30, max: 90, step: 10 },
              apply: { kind: "range", min: 5, max: 20, step: 5 },
            }
          : {
              passed: { kind: "range", min: 60, max: 95, step: 5 },
              total: { kind: "choices", values: [100] },
            },
        expression: permission
          ? [{ param: "sync" }, { param: "apply" }, "add"]
          : [
              { param: "passed" },
              { param: "total" },
              "divide",
              100,
              "multiply",
            ],
        formula: permission ? "{sync} + {apply}" : "{passed} / {total} x 100",
        canonicalUnit: permission ? "seconds" : "percent",
        units: [
          {
            id: permission ? "seconds" : "percent",
            label: permission ? "seconds" : "percent",
            factor: 1,
          },
        ],
      },
    },
    {
      ...base,
      id: `rag-l${level}-sample-02`,
      title: permission
        ? "[sample] Permission check"
        : "[sample] Grounded answers",
      type: "spot_flaw",
      placement: true,
      prompt: permission
        ? "[sample] Retrieval loads all documents into a prompt. The answer is filtered for permissions afterward. What is the flaw?"
        : "[sample] Answers with no supporting sources are accepted if they sound fluent. What is the flaw?",
      options: permission
        ? [
            "Restricted text has already reached generation; filter retrieval by the user's permissions.",
            "The font is too large.",
            "The API needs a different name.",
            "Use a longer prompt.",
          ]
        : [
            "Fluency is not proof; check sources and abstain when evidence is weak.",
            "Increase the page size.",
            "Rename the cache.",
            "Skip all evaluation.",
          ],
      correctIndex: 0,
      why: permission
        ? "[sample] Authorization belongs before restricted content enters the prompt."
        : "[sample] Check groundedness and citations against a labeled test set.",
    },
    {
      ...base,
      id: `rag-l${level}-sample-03`,
      title: permission ? "[sample] Cache isolation" : "[sample] Test a change",
      type: "pick_probe",
      placement: false,
      prompt: permission
        ? "[sample] The design caches generated answers. Ask one question about a permission failure."
        : "[sample] The design adds a new reranker. Ask one question that tests whether quality improved.",
      rubric: permission
        ? "Require a concrete question about user or group cache keys, permission changes, or stale cached restricted answers. Generic scale questions fail."
        : "Require a concrete eval comparison with a labeled set, retrieval or answer metric, or a regression threshold. Names alone fail.",
      seniorAnswer: permission
        ? "How does a revoked user's cached answer stop being served before the revoke deadline?"
        : "Which labeled questions regress after reranking, and what blocks rollout?",
      why: permission
        ? "[sample] Cached answers must obey current permissions."
        : "[sample] A change needs a measured comparison before rollout.",
    },
    {
      ...base,
      id: `rag-l${level}-sample-04`,
      title: permission ? "[sample] Revoke or cache" : "[sample] Weak evidence",
      type: "tradeoff",
      placement: false,
      prompt: permission
        ? "[sample] A permission lookup is slow. Would you serve an old cached answer? Make a call and explain the safety mechanism."
        : "[sample] Retrieval returns weak evidence. Would you answer or abstain? Make a call and explain the check.",
      rubric: permission
        ? "Require a clear call that prevents unauthorized disclosure, a bounded freshness or deny mechanism, and a reason. A vague secure cache answer fails."
        : "Require a clear call, a concrete relevance or citation check, and an abstention or clarification path. A confident answer without evidence fails.",
      seniorAnswer: permission
        ? "Fail closed for restricted answers until permissions can be verified, and show a retry state."
        : "Abstain below a tested relevance threshold and ask for clarification instead of inventing a citation.",
      why: permission
        ? "[sample] A faster answer cannot justify leaking revoked content."
        : "[sample] Missing evidence needs a safe response, not a confident guess.",
    },
    {
      ...base,
      id: `rag-l${level}-sample-05`,
      title: permission
        ? "[sample] Delete handling"
        : "[sample] Retrieved instructions",
      type: "spot_flaw",
      placement: false,
      prompt: permission
        ? "[sample] Deleted documents remain in the vector index indefinitely. What is the flaw?"
        : "[sample] A retrieved document tells the assistant to reveal private files. The system follows it. What is the flaw?",
      options: permission
        ? [
            "Deleted content can still be retrieved; propagate deletion to indexes and caches.",
            "Use a brighter icon.",
            "Store fewer logs.",
            "Increase output length.",
          ]
        : [
            "Retrieved text is untrusted data, not authority to change instructions or permissions.",
            "Increase the batch size.",
            "Remove citation IDs.",
            "Add more output tokens.",
          ],
      correctIndex: 0,
      why: permission
        ? "[sample] Deletion must reach every retrieval and cache path."
        : "[sample] Treat retrieved instructions as data and enforce authorization outside generation.",
    },
  ].map((value) => drillDefinitionSchema.parse(value));
});
