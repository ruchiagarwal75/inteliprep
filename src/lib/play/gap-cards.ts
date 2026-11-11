import "server-only";
/** Learning material is projected only on an explicitly opened gap card, never in a drill question. */
export const gapCards = [
  {
    topic: "rag",
    id: "rag-scale-units",
    title: "Vector and token budgets",
    what: "Turn document, chunk and token counts into storage, throughput and cost.",
    why: "Interviewers want assumptions and units that match the proposed design.",
    mistake: "Mixing bytes, GB, tokens and dollars without converting.",
    senior:
      "State each input, write the units, calculate, and explain what index overhead or peak traffic adds.",
    links: [
      {
        label: "Introduction to Information Retrieval",
        href: "https://nlp.stanford.edu/IR-book/",
      },
    ],
  },
  {
    topic: "rag",
    id: "rag-permissions",
    title: "Permissions on every path",
    what: "Only retrieve evidence the current user can access, including cached results.",
    why: "A correct answer can still be a serious data leak.",
    mistake:
      "Filtering the generated answer after restricted text entered the prompt.",
    senior:
      "Filter before generation, bound revoke delay, scope caches, and test deletes and nested groups.",
    links: [
      {
        label: "OWASP: vector and embedding weaknesses",
        href: "https://genai.owasp.org/llmrisk/llm08-vector-and-embedding-weaknesses/",
      },
    ],
  },
  {
    topic: "rag",
    id: "rag-quality-safety",
    title: "Measure quality and keep boundaries",
    what: "Test retrieval and answer quality while treating retrieved instructions as untrusted data.",
    why: "Plausible text is not proof that an answer is correct or safe.",
    mistake:
      "Trusting fluent answers without source checks or a labeled test set.",
    senior:
      "Compare retrieval recall and grounded answers, gate regressions, and test malicious retrieved content.",
    links: [
      {
        label: "OWASP: prompt injection",
        href: "https://genai.owasp.org/llmrisk/llm01-prompt-injection/",
      },
    ],
  },
] as const;
