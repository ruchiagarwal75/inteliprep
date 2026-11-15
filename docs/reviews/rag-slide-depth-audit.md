# RAG slide depth review

Reviewed all 120 slides across Topics 0 to 9. Expanded or added 109 optional lessons. The 11 orientation and interview-checklist slides remain short because they recap nearby teaching. All 95 quiz definitions, correct choices, feedback, weights and slide references remain unchanged. No saved progress is migrated.

Core slides retain a 120-word limit. Definitions of dimensions, meaning, similarity metrics and bi-encoders also appear in the visible core, so readers do not need the disclosure to understand the basics. Optional lessons define terms, explain a mechanism, work through a concrete example and discuss a decision or failure. They are closed initially, scroll with the slide and appear in the notebook.

## Visual decisions

Keep existing explanatory vector diagrams. Add four where text alone was too abstract: a two-dimensional embedding illustration, a numeric comparison of cosine and dot product, PDF text extraction versus OCR, and a comparison of chunk boundaries. The two-dimensional coordinates are explicitly a teaching example, not real model outputs or named semantic axes. Existing memory, context-budget, revoke-race and evaluation diagrams retain matching worked examples. Use Inter labels, theme colors, smooth lines, arrowheads and alt text in both responsive layouts.

## Technical corrections

- Define ANN before using it, then introduce HNSW as a graph-based ANN algorithm. Remove earlier unexplained ANN/HNSW terms.
- A dimension is a coordinate, not a token or named category. Learned meaning is distributed across coordinates. More dimensions do not guarantee better retrieval.
- Cosine is the cosine of the angle, not the angle itself. Dot product is the sum of coordinate products, not angle times length. The worked example shows different raw rankings and equivalence after normalization.
- Bi-encoders encode query and passage independently, possibly with shared weights. Retrieval encoders and generative models have different roles; they are not necessarily unrelated model architectures.
- Quantization changes the stored encoding, not the number of dimensions. Work through float32 versus int8 bytes, scalar approximation and a product-quantization codebook. Rounding printed values alone does not save storage.
- Compression recall, index memory, reranker latency and storage capabilities depend on implementation and workload. Remove blanket performance promises.
- Overlap can preserve boundary context but does not guarantee every sentence stays intact.
- Current approved authority can matter more than the latest timestamp. Prompts and caches cannot substitute for authorization.
- Valid calculations can introduce supported derived numbers. Valid JSON and citation IDs do not prove factual support.
- Behavioral signals are proxies, and stage p95 values do not add into an end-to-end p95. Avoid full private-prompt logging by default.

## Review by slide

| Topic | Slide | Decision | Teaching gap addressed |
| --- | --- | --- | --- |
| 0 | 1. Why LLMs need help | add | Explain training, inference and why a fluent model is not a current private knowledge store. |
| 0 | 2. RAG in one sentence | expand | Spell out retrieval-augmented generation and walk through retrieval, context and a supported answer. |
| 0 | 3. A tiny example | add | Trace one employee question through candidate evidence, its exception and the cited answer. |
| 0 | 4. When RAG is the right tool | expand | Explain when searchable external knowledge solves the task and when retrieval adds avoidable work. |
| 0 | 5. RAG vs fine-tuning vs long context | add | Distinguish updating weights, supplying context and searching a corpus with concrete decision cases. |
| 0 | 6. Embeddings: meaning as numbers | expand | Define a vector and embedding with a toy example, similarity and the negation counterexample. |
| 0 | 7. Embedding model vs LLM | add | Contrast embedding outputs with generation outputs and explain why each has a separate job. |
| 0 | 8. The two halves of every RAG system | expand | Trace offline indexing and online serving, then separate freshness and permission guarantees. |
| 0 | 9. Where you've already seen RAG | not needed | Orientation use cases already illustrate applications; no extra disclosure needed. |
| 0 | 10. Your path through RAG World | not needed | Navigation recap, not a new concept; keep the path short. |
| 1 | 1. Why ingestion decides answer quality | add | Show how lost source structure causes an error before retrieval or generation starts. |
| 1 | 2. The ingestion pipeline | add | Explain each ingestion step, the produced artifact and how a failed step is retried. |
| 1 | 3. Parsing: every format breaks differently | expand | Define optical character recognition, native PDF text, layout reconstruction and verification. |
| 1 | 4. Cleaning and deduplication | add | Explain boilerplate removal, exact/near duplicates and preserving versions and permission boundaries. |
| 1 | 5. Why we chunk at all | add | Define a chunk, its link to a document, and why it is the retrieval unit instead of the whole document. |
| 1 | 6. Chunk size and overlap | expand | Explain token limits, chunk stride and overlap with a worked count and an exception split. |
| 1 | 7. Chunking strategies | add | Compare fixed, recursive, structure-aware, semantic and parent-child strategies with selection examples. |
| 1 | 8. Respect the structure | add | Explain headings, tables and code boundaries with a self-contained table-row example. |
| 1 | 9. Small-to-big retrieval | add | Distinguish the small search unit from the larger parent context and enforce access on both. |
| 1 | 10. Metadata on every chunk | expand | Explain document/chunk identity, provenance, versions and ACL metadata with an example record. |
| 1 | 11. Keeping the index fresh | expand | Explain change detection, idempotent processing and safe publication of a new chunk set. |
| 1 | 12. Deletes and permission changes | expand | Walk through deletion tombstones, stale workers and an access revoke before the next index sync. |
| 1 | 13. Interview checklist | not needed | Checklist recap; prior slides and examples carry the explanations. |
| 2 | 1. What an embedding really is | add | Explain tokenization, learned text encoders and why vector dimensions are not named categories. |
| 2 | 2. Measuring "close" | expand | Work through cosine, dot product and distance; distinguish similarity from truth or probability. |
| 2 | 3. Bi-encoders: why search is fast | add | Show precomputed document vectors and one query encoding, and explain the speed/interaction tradeoff. |
| 2 | 4. Choosing an embedding model | add | Explain domain/language tests, length limits, versioning and paired query/document encoders. |
| 2 | 5. Memory math | expand | Work through vectors, precision, copies and excluded overhead without a universal RAM multiplier. |
| 2 | 6. Quantization: smaller vectors | add | Explain scalar and product quantization, a toy rounding error and measuring recall after compression. |
| 2 | 7. Exact vs approximate search | add | Define exact search, approximate nearest neighbors and recall against an exact reference. |
| 2 | 8. HNSW: a graph you walk | expand | Trace HNSW coarse-to-fine graph search and explain build/search settings and memory costs. |
| 2 | 9. IVF: search only nearby clusters | add | Explain coarse clusters, probe count, balance and training with a worked fraction of vectors searched. |
| 2 | 10. Picking a vector store | add | Separate vector search capability from durable storage, filters, deletes and operations requirements. |
| 2 | 11. Filters and multi-tenant data | add | Explain filtering before/during/after search, result starvation and tenant permission tests. |
| 2 | 12. Changing embedding models | expand | Walk through dual indexes, paired encoders, backfill, cutover and rollback. |
| 2 | 13. Interview checklist | not needed | Checklist recap; do not repeat a second lesson in the summary. |
| 3 | 1. Retrieval is the ceiling | add | Explain why missing evidence limits downstream answers and how to locate the first missing boundary. |
| 3 | 2. Dense search: matching meaning | add | Teach semantic matching, a paraphrase example and where exact identifiers and negation break it. |
| 3 | 3. Keyword search: BM25 | add | Explain BM25 term rarity, saturating frequency and length normalization with a concrete corpus example. |
| 3 | 4. Hybrid search | expand | Explain complementary retrieval, candidate deduplication and how to measure the combined result. |
| 3 | 5. RRF, step by step | expand | Work through reciprocal rank fusion scores, smoothing and why fusion is not confidence. |
| 3 | 6. Query rewriting | add | Explain context-dependent query rewriting and the risk of inventing a constraint or dropping a code. |
| 3 | 7. Multi-query and decomposition | add | Compare alternative queries with decomposition; show union, dedupe and fan-out cost. |
| 3 | 8. Filters and boosts | add | Distinguish hard access filters from soft business boosts and test failure boundaries. |
| 3 | 9. How many results? | expand | Explain candidate count versus prompt count, recall curves and a rank-cutoff failure. |
| 3 | 10. Routing: search the right place | add | Explain corpus routing and federated search with an ambiguous question and a fallback. |
| 3 | 11. Debugging bad retrieval | expand | Use source/version identifiers to trace ingestion, filtering, retrieval and prompt selection. |
| 3 | 12. Interview checklist | not needed | Checklist recap; retain links to the already explained decisions. |
| 4 | 1. Why re-rank? | add | Explain retrieval versus re-ranking with candidates that share words but answer different questions. |
| 4 | 2. Bi-encoder vs cross-encoder | expand | Demonstrate independent embeddings versus joint query-passage interactions and batched pair scoring. |
| 4 | 3. The two-stage pipeline | add | Explain candidate budgets at each stage and the quality ceiling when first-stage evidence is missing. |
| 4 | 4. Kinds of re-rankers | add | Compare lexical, cross-encoder and generative re-rankers by mechanism, labels and serving cost. |
| 4 | 5. Latency and cost | add | Build an example latency budget and explain batching, input lengths, queues and tail latency. |
| 4 | 6. How many candidates? | expand | Explain recall/latency curves and why more candidates can reach diminishing returns. |
| 4 | 7. Scores and "no good answer" | expand | Distinguish ranking scores from calibrated confidence and build a no-answer threshold test. |
| 4 | 8. Diversity: avoid five copies | expand | Explain redundancy and MMR with complementary evidence and a warning about unrelated novelty. |
| 4 | 9. Business rules on top | add | Separate access control, source authority, freshness and relevance when applying policy rules. |
| 4 | 10. Fine-tuning a re-ranker | add | Explain query-positive-negative training pairs, hard negatives and leakage-safe evaluation splits. |
| 4 | 11. Measuring re-ranking | add | Explain ranking metrics versus downstream answer quality on the same candidate set. |
| 4 | 12. Interview checklist | not needed | Checklist recap; no duplicate explainer needed. |
| 5 | 1. The prompt is the product | add | Explain instructions, question, sources and output format as separate prompt roles. |
| 5 | 2. The token budget | expand | Define a token and budget instructions/history/evidence/output with an explicit example. |
| 5 | 3. Order matters: lost in the middle | expand | Explain evidence-position effects and test order/length rather than assuming a universal pattern. |
| 5 | 4. Formatting chunks | expand | Show stable source IDs, headings, dates and quoted data boundaries in a usable context record. |
| 5 | 5. Rules that ground the answer | add | Explain grounded answers, citations, abstention and why instructions are not an access-control layer. |
| 5 | 6. Chat history | add | Distinguish conversation history from evidence and show how summaries can lose constraints. |
| 5 | 7. Compressing context | add | Explain extractive versus generative compression and preserving exceptions and provenance. |
| 5 | 8. Duplicates and conflicts | expand | Walk through duplicate chunks and conflicting versions without blending incompatible policies. |
| 5 | 9. Prompt injection through documents | add | Explain retrieved-content injection, trust boundaries and why prompt wording alone is insufficient. |
| 5 | 10. Prompt caching | add | Explain reusable token prefixes, cache keys, invalidation and why caching is not answer memory. |
| 5 | 11. Treat prompts like code | add | Explain versioned templates, test cases, rollout and rollback as one reproducible prompt change. |
| 5 | 12. Interview checklist | not needed | Checklist recap; keep it compact. |
| 6 | 1. What generation has to get right | add | Distinguish relevance, faithfulness, completeness and usefulness with a short answer example. |
| 6 | 2. Choosing and routing models | add | Explain model selection and routing by task difficulty, quality gates, latency and total cost. |
| 6 | 3. Sampling settings | add | Define temperature and top-p and explain why low randomness cannot repair missing evidence. |
| 6 | 4. Hallucination in RAG | add | Trace retrieval, context and generation causes of unsupported claims and their different remedies. |
| 6 | 5. Citations you can trust | expand | Distinguish existing citations from supporting citations and check claims against the current source. |
| 6 | 6. Checking faithfulness | add | Explain claim decomposition, support checks and the limits of automated verification. |
| 6 | 7. Structured output | add | Contrast valid JSON/schema conformance with fact correctness and safe rendering. |
| 6 | 8. Streaming and latency | expand | Define first-token versus full-answer time, streaming checks and reconnect/error behavior. |
| 6 | 9. Saying "I don't know" well | expand | Distinguish missing evidence, missing permission and service failure without leaking protected data. |
| 6 | 10. Cost control | expand | Calculate the cost of all pipeline stages, retries and output length using explicit assumptions. |
| 6 | 11. Guardrails on the output | add | Distinguish policy checks, data-loss controls and output encoding; explain false positives and fallbacks. |
| 6 | 12. Interview checklist | not needed | Checklist recap; keep the close short. |
| 7 | 1. Why RAG needs its own evals | add | Explain separate ingestion, retrieval and answer evaluation and why a global score hides causes. |
| 7 | 2. Building a test set | add | Build labeled examples with source version, permissions, answerability and held-out slices. |
| 7 | 3. Synthetic questions | add | Explain synthetic question generation, source leakage and independent human review. |
| 7 | 4. Retrieval metrics | expand | Define precision@k, recall@k, hit rate, MRR and NDCG using explicit denominators and small examples. |
| 7 | 5. Generation metrics | add | Distinguish correctness, groundedness, completeness and citation support with contrasting answers. |
| 7 | 6. LLM as a judge | expand | Explain a judge as a noisy measurement tool, human calibration and systematic bias. |
| 7 | 7. Regression gates | expand | Turn quality and permission checks into a reproducible gate with slice-aware regression review. |
| 7 | 8. Online evaluation | expand | Distinguish online experiments, behavioral proxies and actual answer correctness. |
| 7 | 9. Don't fool yourself with noise | add | Explain sampling noise, paired comparisons, uncertainty and stable held-out queries. |
| 7 | 10. Cost and latency belong in the report | add | Explain end-to-end quality/cost/latency measurements, distributions and overload conditions. |
| 7 | 11. Common eval mistakes | add | Walk through leakage, easy-only datasets, wrong denominators and benchmark overfitting. |
| 7 | 12. Interview checklist | not needed | Checklist recap; no second full explanation. |
| 8 | 1. From demo to production | add | Explain concurrency, queues, freshness and dependency failure beyond a successful single request. |
| 8 | 2. The serving architecture | add | Trace sync query serving and async ingestion with deadlines, backpressure and distinct state. |
| 8 | 3. Freshness: how stale is OK? | add | Define end-to-end staleness and separate document freshness, deletion and permission revocation. |
| 8 | 4. Streaming updates | expand | Explain ordered versions, idempotent events, tombstones, retries and replay after downtime. |
| 8 | 5. Scaling the vector index | add | Define shards and replicas, query fan-out, skew and capacity with filtered retrieval. |
| 8 | 6. Caching | expand | Compare query/vector/retrieval/answer caches and show a permission- and version-scoped cache key. |
| 8 | 7. Latency budgets and p95 | expand | Define percentiles and explain why stage p95 values cannot be added as the system p95. |
| 8 | 8. Rate limits and capacity | expand | Work through request and token quotas, in-flight concurrency and bounded overload. |
| 8 | 9. Graceful degradation | add | Design explicit fallback behavior for reranker, vector search, authorization and model outages. |
| 8 | 10. Multi-tenant isolation | add | Explain tenant IDs, per-user ACLs, isolation models and noisy-neighbor budgets. |
| 8 | 11. Observability | add | Explain per-stage traces, operational metrics, freshness lag and minimized/redacted diagnostic data. |
| 8 | 12. Interview checklist | not needed | Checklist recap; keep the summary scannable. |
| 9 | 1. How RAG systems fail | add | Classify a bad result by its first failed boundary rather than treating every error as hallucination. |
| 9 | 2. Tracing one wrong answer | expand | Reconstruct a wrong answer using source versions, retrieval IDs and safe trace metadata. |
| 9 | 3. Direct and indirect prompt injection | expand | Explain direct versus retrieved-content injection and what crossing a trust boundary means. |
| 9 | 4. Limit the blast radius | add | Explain least privilege, policy enforcement and confirmation for any separately authorized actions. |
| 9 | 5. Leaks through permissions | expand | Test access at retrieval, context, cache and citation links with a revoke-race walkthrough. |
| 9 | 6. Personal data | add | Explain PII, collection minimization, retention and deletion across index, logs, caches and evals. |
| 9 | 7. Hallucination at scale | add | Explain compounding unsupported-claim rates, verification sampling and no-answer behavior. |
| 9 | 8. Harmful and off-topic requests | add | Distinguish safe discussion of harmful material from instructions to execute it and test policy errors. |
| 9 | 9. Cost attacks | add | Explain amplification through large contexts, query fan-out, retries and fair token budgets. |
| 9 | 10. Red teaming | add | Build a threat-model-based red-team case with an observable pass/fail result. |
| 9 | 11. Safe rollout | expand | Walk through shadow/canary release, slice-based gates, rollback and incident response. |
| 9 | 12. Interview checklist | not needed | Checklist recap; rely on the worked cases instead of adding repeated prose. |

## Reference checks

Reviewed primary material for OCR and reading order, recursive text splitting, BM25 term frequency and length normalization, vector representations and index storage, reciprocal rank fusion and RAG security. Further-reading links remain optional; the explanations teach the concept without requiring an external page. Example workloads, prices and coordinates are labeled as illustrations, not provider benchmarks.
