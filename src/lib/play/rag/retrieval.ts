import "server-only";
import { drillDefinitionSchema } from "../definition";
/** Authored source: docs/play-content/rag-levels-1-2.md. Keep this module private. */
export const retrievalDrills = [
  {
    id: "rag-l1-01",
    topic: "rag",
    level: 1,
    sample: false,
    placement: true,
    type: "spot_flaw",
    title: "Chunk size",
    prompt:
      "Documents are split into fixed 8,000-token chunks. Only the top 1 chunk is sent to the LLM.",
    options: [
      "Chunks this large mix many topics, so the match is weak and the context window fills with noise",
      "The documents should be stored in SQL instead",
      "The embeddings must be at least 4,096 dimensions",
      "The system needs a CDN in front of retrieval",
    ],
    correctIndex: 0,
    why: "Huge chunks dilute relevance and waste context. Smaller chunks (a few hundred tokens), some overlap, and top-k > 1 work better. Verify with recall@k on a test set.",
  },
  {
    id: "rag-l1-02",
    topic: "rag",
    level: 1,
    sample: false,
    placement: true,
    type: "spot_flaw",
    title: "Exact-match retrieval",
    prompt:
      "Users search for exact error codes like ERR_4012 and part numbers. Retrieval is vector search only.",
    options: [
      "Vector search often misses exact rare tokens like IDs and codes; add keyword search (hybrid)",
      "Vector search can't handle more than 1M documents",
      "Error codes must be translated into English first",
      "The LLM should be fine-tuned on every error code",
    ],
    correctIndex: 0,
    why: "Embeddings capture meaning, not exact strings. Hybrid retrieval (keyword + vector) catches IDs, codes and names.",
  },
  {
    id: "rag-l1-03",
    topic: "rag",
    level: 1,
    sample: false,
    placement: false,
    type: "tradeoff",
    title: "Choose a chunk size",
    prompt:
      "Your wiki has long how-to pages. Chunk size: 200 tokens or 1,000 tokens? Make a call and give your reason in 1 to 3 sentences.",
    rubric:
      'Pass if the answer: makes a clear call; names the trade-off (small chunks = precise but lose context, large chunks = more context but diluted match); AND says how to check it (a test set, recall@k, answer quality) or a way to get both (overlap, retrieve small then expand to the parent section).\nFail if: no call, or "it depends" with no mechanism.',
    seniorAnswer:
      "Around 200 to 400 with overlap, then expand hits to their parent section, so the match is precise but the LLM sees full steps. I'd compare both sizes on recall@10 against a labeled question set.",
    why: "Choose a size, explain precision versus context, and test it or recover the parent context.",
  },
  {
    id: "rag-l1-04",
    topic: "rag",
    level: 1,
    sample: false,
    placement: false,
    type: "spot_flaw",
    title: "Tables in PDFs",
    prompt:
      "PDFs are parsed to plain text line by line, including tables, then chunked.",
    options: [
      "Table rows and column headers get separated, so answers about table values are wrong",
      "PDFs can't be embedded at all",
      "Plain text is too large to store",
      "Line-by-line parsing makes retrieval slower than 1 second",
    ],
    correctIndex: 0,
    why: "Tables lose structure. Use table-aware parsing, keep each table (or row) together with its headers, and test questions about table values.",
  },
  {
    id: "rag-l1-05",
    topic: "rag",
    level: 1,
    sample: false,
    placement: false,
    type: "pick_probe",
    title: "Probe the reranker",
    prompt:
      "Hybrid retrieval (keyword + vector) returns the top 50 merged results. A cross-encoder reranker picks the top 5. The top 5 go to the LLM.\n\nWrite the one follow-up question you'd ask this candidate.",
    rubric:
      "Pass if the question targets a real failure mode or cost of something in this design, for example: reranker latency or cost at p95; how keyword and vector scores are merged; what happens when the answer isn't in the top 50 (recall); how they know the reranker helps (measurement).\nFail if: generic (\"how would you scale it?\"), or about a part that isn't in the design.",
    seniorAnswer:
      "How many of your misses are retrieval misses, meaning the right chunk isn't in the top 50 at all? The reranker can't fix that.",
    why: "Probe the cost or failure mode of a component the candidate actually chose.",
  },
  {
    id: "rag-l1-06",
    topic: "rag",
    level: 1,
    sample: false,
    placement: false,
    type: "spot_flaw",
    title: "Embedding migration",
    prompt:
      "The team switched to a new embedding model. New queries are embedded with the new model and searched against document vectors made with the old model.",
    options: [
      "Vectors from different models aren't comparable, so results become close to random; the corpus must be re-embedded",
      "It works, but only 10% slower",
      "Only the query cache needs clearing",
      "The LLM will correct for the mismatch",
    ],
    correctIndex: 0,
    why: "Each model has its own vector space. Re-embed everything into a new index, run both indexes during the switch, and cut over after quality checks.",
  },
  {
    id: "rag-l1-07",
    topic: "rag",
    level: 1,
    sample: false,
    placement: false,
    type: "tradeoff",
    title: "Budget for reranking",
    prompt:
      "First-token budget is 2 s at p95. Retrieval takes 300 ms. The LLM's first token takes 900 ms. A reranker adds about 250 ms for 50 candidates. Add the reranker or not? Give your reason in 1 to 3 sentences.",
    rubric:
      "Pass if the answer: does the budget math (300 + 250 + 900 = 1,450 ms, under 2,000 ms with about 550 ms to spare); makes a call; AND ties it to measuring the quality gain, or names a way to cut cost (rerank fewer candidates).\nFail if: no math, or a call with no reason.",
    seniorAnswer:
      "Yes. 1.45 s fits the 2 s budget with about 0.5 s of room. I'd keep it only if it improves answer quality on our eval set, and I'd rerank 30 instead of 50 if p95 gets tight.",
    why: "The total is 1,450 ms. Keep the reranker only if measured quality improves within the budget.",
  },
  {
    id: "rag-l1-08",
    topic: "rag",
    level: 1,
    sample: false,
    placement: false,
    type: "spot_flaw",
    title: "Weak retrieval",
    prompt:
      "When retrieval finds nothing relevant (all scores are low), the assistant answers from the model's own knowledge anyway.",
    options: [
      "It will make up answers with no sources; it should say it couldn't find a source, or ask a clarifying question",
      "It should retry the same search 10 times",
      "It should return the 5 lowest-scoring chunks",
      "This is fine because the model knows the company",
    ],
    correctIndex: 0,
    why: "An enterprise assistant must cite sources. Set a relevance threshold and abstain or ask for clarification below it.",
  },
].map((value) => drillDefinitionSchema.parse(value));
