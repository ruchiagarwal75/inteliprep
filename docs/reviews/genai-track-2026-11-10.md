# GenAI track review, November 10, 2026

## Schema and engine review

Problems have public briefs and level openings, server-only facts, estimate anchors, level bars, grading references, per-problem rubrics, five stages and applicable probes. The original eight core configurations are unchanged. Scores are independent 1–4 values or unassessed, without numeric weights or a weighted total. GenAI uses seven areas, including Evaluation and quality and Safety and security; cost has its own problem-specific area.

Keyword inventory: [interviewer-keywords.md](../interviewer-keywords.md). It covers clarification and estimation detection, diagram aliases, topic matching, probe triggers, pacing, proposals, evidence eligibility and problem patterns. GenAI adds token/GPU/embedding/vector/context/cost/rate-limit vocabulary, while core behavior is unchanged.

Facts are disclosed one requested table row at a time. Expected designs never enter reply prompts. Anchors enter only private arithmetic assessment and grading. Unspecified representation/message sizes are candidate assumptions: accept justified vector representations and about 1–5 KB per chat exchange, probe extremes and repeated prompt storage, and offer Mid-only suggestions only after an attempted estimate and a request for help.

## Evaluation method

Real local provider calls use the existing environment configuration: interviewer/assessment gpt-6.1-terra and scorecard gpt-6.1-sol at configured higher reasoning. No credentials or environment settings were changed. Synthetic scripts and diagrams are committed under tests/fixtures/genai; opt-in tests are under tests/live with vitest.genai.config.mts. They call the actual engine/provider, not fixture model replies. CI continues to use unit and isolated browser fixtures.

Scripts directly select stages to exercise the whole discussion without waiting 45 minutes. They are bounded content tests, not measured 45-minute candidate sessions. Candidates explicitly choose evaluation and safety topics in the scripts; passing these checks does not establish natural coverage for every possible conversation. Weak/strong grading intentionally tests content independently of the production duration gate.

## Scripted interview results

### enterprise-rag-assistant

**mid:** 22 turns, including deterministic single-fact clarifications and real-model design discussion.

- Stage 3: You filter retrieval by the employee's permissions before fetching content. How does the Scoped answer cache avoid returning an answer after the employee loses access to one of its sources?
- Stage 4: A per-user cache separates employees’ cached answers. After a permission sync reflects an employee’s lost access, what prevents their per-user cache from returning an answer based on that source?
- Stage 4: The deny ledger handles revocations once they’re known to your system. What happens if an employee’s access is revoked at the source but the permission sync stream hasn’t received that change yet?
- Stage 4: The replica fails closed when permission versions can't be confirmed. How would you use the Eval and tracing component to check whether a retrieval change improves answer quality before launch?
- Stage 4: What evidence would you compare before releasing a retrieval change to decide whether answer quality has improved?
- Stage 4: Your evaluation plan checks both answer quality and access leaks before release. If a retrieved document instructs the assistant to list salary files, how would your design handle that instruction?
- Stage 4: How would the LLM distinguish a retrieved document’s instruction to list salary files from the employee’s actual request?
- Stage 4: You enforce access controls outside the model. How much of your end-to-end latency budget would you allocate to the Reranker, and why?
- Stage 5: Reducing context could lower model costs. How would you decide how much context to cut without hurting answer quality?

**senior:** 23 turns, including deterministic single-fact clarifications and real-model design discussion.

- Stage 1: Could you redo that estimate, showing the units and assumptions at each step?
- Stage 3: The retrieval filters enforce permissions before content reaches the model. How does the Scoped answer cache prevent a previously authorized answer from being returned after the employee loses access to a cited document?
- Stage 4: A per-user cache separates entries by "Employee". With the per-user cache, what happens when that user's access to a cited document is revoked after the answer is cached?
- Stage 4: Keyword search provides a degraded fallback. If the vector index fails while its replica is behind, how would promotion affect recently changed documents?
- Stage 4: The replica is rejected when its freshness or permissions can't be confirmed. How would you use your test set to measure whether a change improves retrieval and answer quality before launch?
- Stage 4: What measures would you compare on the test set to judge retrieval and answer quality before releasing a change?
- Stage 4: The release gate checks both access leaks and quality regressions. If a retrieved document instructs the assistant to list salary files, how would your design prevent that instruction from controlling the answer?
- Stage 4: How does your design keep an instruction embedded in a retrieved document from directing the assistant to list salary files?
- Stage 4: You enforce access controls outside the model. How much of your two-second first-token budget would you allocate to the Reranker, and why?
- Stage 5: Provider prices are unspecified, so you can choose and justify an assumption. How would you decide how much to reduce the context while checking that answer quality remains acceptable?

**staff:** 22 turns, including deterministic single-fact clarifications and real-model design discussion.

- Stage 3: The retrieval filters restrict passages before they reach the model. How does the Scoped answer cache prevent an answer from being returned after the employee loses access to one of its sources?
- Stage 4: The per-user cache separates employees' answers. How does the per-user cache handle an entry whose source access was revoked after it was cached?
- Stage 4: The deny ledger covers revocations once it receives them. If the permission sync stream is delayed, how does your design meet the one-minute revocation requirement when it allows up to five minutes of staleness?
- Stage 4: The replica fails closed when permission freshness can't be confirmed. How would you use "Eval and tracing" to decide whether a retrieval change is safe to launch?
- Stage 4: What evidence from "Eval and tracing" would you require before launching a retrieval change?
- Stage 4: Your launch gate includes access checks and quality regression tests. If a retrieved document instructs the assistant to list salary files, how does your design prevent that instruction from controlling the answer?
- Stage 4: When a retrieved document tells the assistant to list salary files, how does your design keep that document's instructions from directing the LLM?
- Stage 4: Access controls sit outside the model's trust boundary. How much of your first-token latency budget does the Reranker consume under peak load?
- Stage 5: Provider prices and the current cost baseline haven't been specified. How would you decide how much to reduce the context while checking that answer quality remains acceptable?

The config tests check every fact at all three levels and public projections. Build verification scans browser chunks for private facts, anchors and rubric content.

### ai-chat-assistant

**mid:** 14 turns, including deterministic single-fact clarifications and real-model design discussion.

- Stage 1: Could you redo that estimate, showing the units and assumptions at each step?

**senior:** 22 turns, including deterministic single-fact clarifications and real-model design discussion.

- Stage 1: Could you redo that estimate, showing the units and assumptions at each step?
- Stage 3: The gateway checks tier budgets before the chat service creates a turn. How do the token budgets in the gateway enforce the free tier's limit on large-model messages?
- Stage 4: The bounded queue gives requests a place to wait when GPU capacity is unavailable. A GPU node dies while producing an answer. What does the user see?
- Stage 4: The retry makes interrupted answers explicit. What happens if a worker completes a turn but loses its queue acknowledgement, so the same work is delivered again?
- Stage 4: How would you use "Evaluation" to check a new model's answer quality and safety before rollout?
- Stage 4: The evaluation plan compares quality and safety before and during rollout. If the queue delivers an already completed turn to another worker, how does your design prevent a duplicate answer or GPU work?
- Stage 4: How does "Input and output moderation" affect the time until the user sees the first streamed token?
- Stage 4: Moderation adds a buffering step before streamed output is released. What would make you stop or roll back your new-model rollout?
- Stage 5: How would you choose a paid-tier limit that balances cost and user experience, and check whether that choice works?

The config tests check every fact at all three levels and public projections. Build verification scans browser chunks for private facts, anchors and rubric content.

## enterprise-rag-assistant: weak Senior scorecard

**Signal: strong_no.** Accurate initial vector sizing is outweighed by explicit authorization leaks, unsafe cache behavior, weak grounding and inadequate quality controls. The proposed design is not suitable for a security-sensitive enterprise assistant.

| Area | Score | Rationale |
| --- | --- | --- |
| Requirements and estimation | 2 | Correctly derives 50M vectors and approximately 154 GB of raw embeddings using explicit representation assumptions, and acknowledges latency and cost targets. Requirements and estimation remain incomplete around update volumes, token consumption, freshness and permission-change goals. |
| Ingestion and retrieval | 1 | Daily polling without incremental updates or delete handling leaves the ingestion lifecycle incomplete. Whole-document prompting and a popularity-based vendor choice do not establish a reasoned parsing, chunking or retrieval strategy. |
| Grounded answers and citations | 1 | Guessing when retrieval is empty and accepting arbitrary model-written links undermine both grounding and citation correctness. No concrete latency allocation supports the answer-generation path. |
| Freshness and reliability | 1 | Deletes and revocations may remain ineffective indefinitely, and the vector-store failure fallback serves cached answers even when permissions are unknown. This is an explicitly unsafe recovery policy rather than a reliable freshness strategy. |
| Cost, operations and evolution | 1 | An aggregate monthly invoice does not establish cost per question or identify expensive request paths. The explicit absence of per-stage tracing and document-version provenance also prevents effective diagnosis of bad answers. |
| Evaluation and quality | 1 | Quality assessment relies on a few fluent examples and an automated judge without human calibration, with no evaluation set or retrieval metrics. This cannot reliably detect retrieval or answer-quality regressions before rollout. |
| Safety and security | 1 | Post-generation permission checks and cross-user answer sharing permit restricted information to reach generation and other employees. Following instructions embedded in retrieved documents creates an additional explicit prompt-injection path. |

**Requirements and estimation, candidate evidence:** “At ten chunks per document I get 50M vectors.”

**Requirements and estimation, candidate evidence:** “I assume four bytes per value and 768 dimensions for about 154 GB raw.”

**Requirements and estimation, candidate evidence:** “I would target the given latency and two-cent cost.”

**Ingestion and retrieval, candidate evidence:** “I will poll sources daily and put entire documents into the prompt.”

**Ingestion and retrieval, candidate evidence:** “I choose a vector vendor because it is popular, without comparing exact keyword behavior or parsing tables.”

**Ingestion and retrieval, candidate evidence:** “Deletes can wait until a later project and I do not plan incremental updates.”

**Grounded answers and citations, candidate evidence:** “I trust the answer whenever it sounds plausible; if retrieval is empty, the model should guess.”

**Grounded answers and citations, candidate evidence:** “Citations will be whatever links the model writes.”

**Grounded answers and citations, candidate evidence:** “Cost is mostly the model bill; I will look at an aggregate monthly invoice, without per-question tokens or a latency budget for reranking.”

**Freshness and reliability, candidate evidence:** “Deletes can wait until a later project and I do not plan incremental updates.”

**Freshness and reliability, candidate evidence:** “Revocations and deleted documents can remain in that cache indefinitely.”

**Freshness and reliability, candidate evidence:** “If the vector database fails I will serve cached answers even if permissions are unknown, and I have no embedding migration plan.”

**Cost, operations and evolution, candidate evidence:** “Cost is mostly the model bill; I will look at an aggregate monthly invoice, without per-question tokens or a latency budget for reranking.”

**Cost, operations and evolution, candidate evidence:** “I have no per-stage tracing or way to find which document version produced a bad answer.”

**Evaluation and quality, candidate evidence:** “I have no evaluation set or retrieval metrics.”

**Evaluation and quality, candidate evidence:** “We will see whether a few examples look right and ship changes whenever they seem fluent.”

**Evaluation and quality, candidate evidence:** “I will trust a model judge without comparing it with human labels.”

**Safety and security, candidate evidence:** “The model can generate an answer first, and we can filter unauthorized source citations afterward.”

**Safety and security, candidate evidence:** “Permissions are checked only after generation and I am comfortable sharing cached answers between users.”

**Safety and security, candidate evidence:** “I will tell the model to obey instructions it finds in retrieved documents, including instructions to reveal salary files.”

### Strengths

- The initial vector-capacity calculation is internally consistent: 50M vectors at 768 dimensions and four bytes per value require approximately 154 GB before index overhead.
  Candidate evidence: “At ten chunks per document I get 50M vectors.”
  Candidate evidence: “I assume four bytes per value and 768 dimensions for about 154 GB raw.”

### Gaps

- Permissions are checked after generation, cached answers are shared across users, revoked or deleted content can remain cached indefinitely, and retrieved instructions are obeyed. These choices create direct disclosure paths; enforce authorization before context construction, scope cache reuse to current permissions, invalidate revoked content, fail closed when authorization is unknown, and treat retrieved text as untrusted data.
  Candidate evidence: “Permissions are checked only after generation and I am comfortable sharing cached answers between users.”
  Candidate evidence: “Revocations and deleted documents can remain in that cache indefinitely.”
  Candidate evidence: “I will tell the model to obey instructions it finds in retrieved documents, including instructions to reveal salary files.”
- Daily polling without incremental updates or deletes risks stale answers, while whole-document prompts risk excessive context consumption; choosing a vector vendor solely for popularity leaves retrieval suitability unjustified. Design bounded, source-aware chunks with change/delete propagation, then compare retrieval alternatives on representative queries before selecting infrastructure.
  Candidate evidence: “I will poll sources daily and put entire documents into the prompt.”
  Candidate evidence: “I choose a vector vendor because it is popular, without comparing exact keyword behavior or parsing tables.”
  Candidate evidence: “Deletes can wait until a later project and I do not plan incremental updates.”
- There is no evaluation set or retrieval measurement, the model judge is not calibrated against human labels, and empty retrieval triggers guessing. Unsupported answers can therefore pass unchecked; build a human-labeled test set, measure retrieval relevance, groundedness and citation validity, calibrate automated judging, and require abstention when evidence is insufficient.
  Candidate evidence: “I have no evaluation set or retrieval metrics.”
  Candidate evidence: “I will trust a model judge without comparing it with human labels.”
  Candidate evidence: “I trust the answer whenever it sounds plausible; if retrieval is empty, the model should guess.”

**Next practice:** Design an enterprise RAG assistant. Redesign one question-to-answer path with authorization before retrieval context reaches the model, permission-scoped caching and revocation handling. Then demonstrate its behavior on a revoked-access case, a malicious retrieved instruction and an empty-retrieval case, using explicit grounding and citation checks.

## enterprise-rag-assistant: strong Senior scorecard

**Signal: strong_yes.** Strong design with consistent sizing, reasoned hybrid retrieval, permission-safe generation and caching, and credible evaluation and recovery plans. The main improvement is to give the first-token latency budget explicit headroom.

| Area | Score | Rationale |
| --- | --- | --- |
| Requirements and estimation | 3 | Requirements discovery covers workload, freshness, revocations, latency and cost. The calculations consistently derive raw vector storage, update volume, query rates and token volume while distinguishing index overhead from raw storage. |
| Ingestion and retrieval | 3 | Incremental, versioned ingestion and tombstones address updates and deletes. Hybrid retrieval and bounded reranking have clear justifications tied to exact-match coverage, semantic matching and latency. |
| Grounded answers and citations | 3 | Versioned numbered sources, authorized-passage citation checks and abstention provide a concrete grounding approach. The explicit first-token allocations total approximately two seconds, leaving no clear headroom below the latency target. |
| Freshness and reliability | 4 | Immediate revoke denial, permission-filtered degradation and bounded retries give explicit failure behavior. Shadow-index evaluation, sampled dual reads and alias rollback provide a credible migration validation plan while preserving availability. |
| Cost, operations and evolution | 3 | Cost accounting includes model tokens and supporting services, with bounded context and duplicate-work reduction prioritized before quality compromises. Per-stage tracing includes version references while keeping private document text out of general logs. |
| Evaluation and quality | 4 | Retrieval, citation, grounding and abstention are measured separately, and automated judging is calibrated against human labels. Access-isolation and quality regression gates, followed by canary feedback, make the evaluation plan actionable. |
| Safety and security | 4 | Authorization precedes content fetching and generation, and caches are isolated by user and permission/document versions. Instruction separation and adversarial-document and cross-user tests provide concrete defenses beyond relying on model obedience. |

**Requirements and estimation, candidate evidence:** “I need employee count, document count and source types, daily questions with peak factor, update frequency, permission revocation bound, latency and cost target.”

**Requirements and estimation, candidate evidence:** “I assume float32 values at four bytes each: 50M chunks times 768 times four is about 154 GB raw, before an index overhead measurement; updates require about 1M chunks daily.”

**Requirements and estimation, candidate evidence:** “Questions average about 1.16 per second, 3.47 peak, and the stated 4,500 tokens imply 450M tokens daily.”

**Ingestion and retrieval, candidate evidence:** “Incremental connectors store per-source watermarks, deduplicate by source document version and feed parsing and cleaning.”

**Ingestion and retrieval, candidate evidence:** “Tombstones remove deleted chunks from both keyword and vector indexes; versioned publishes prevent mixed document versions.”

**Ingestion and retrieval, candidate evidence:** “I choose hybrid keyword and vector retrieval for exact identifiers and paraphrases, then rerank a bounded candidate set because reranking every chunk would blow the latency budget.”

**Grounded answers and citations, candidate evidence:** “Rerank authorized results, build numbered sources with immutable document versions, and stream the answer.”

**Grounded answers and citations, candidate evidence:** “Check every citation points to a retrieved authorized passage; reject unsupported claims and abstain when confidence or relevance is weak.”

**Grounded answers and citations, candidate evidence:** “Budget 100 ms auth, 300 ms retrieval, 200 ms rerank and 200 ms context work, leaving about 1.2 seconds to first model token and measuring the full answer against eight seconds.”

**Freshness and reliability, candidate evidence:** “Revokes invalidate cache entries and a deny ledger applies immediately while indexes catch up within five minutes.”

**Freshness and reliability, candidate evidence:** “The vector store can fall back to permission-filtered keyword search with a degraded notice; model rate limits use a bounded queue, exponential backoff with jitter and an explicit unavailable result rather than fabricated content.”

**Freshness and reliability, candidate evidence:** “Re-embedding migrations build a versioned shadow index, evaluate it, dual-read a sampled cohort and switch an alias with rollback while the old index serves queries.”

**Cost, operations and evolution, candidate evidence:** “Compute cost per question from actual input and output tokens at the chosen provider rates, reranking, embeddings, index storage and connector work.”

**Cost, operations and evolution, candidate evidence:** “Compare with two cents and adjust bounded context and duplicate work before quality compromises; no provider price has been specified.”

**Cost, operations and evolution, candidate evidence:** “Trace each stage with document and ACL version references and latency metrics, keeping private text out of general logs.”

**Evaluation and quality, candidate evidence:** “Measure retrieval Recall@k, citation correctness, groundedness and abstention precision independently.”

**Evaluation and quality, candidate evidence:** “Calibrate any LLM judge against human labels and measure agreement and regressions, not just a fluent answer.”

**Evaluation and quality, candidate evidence:** “Gate releases on no access leaks and quality non-regression, then run a canary with user feedback and per-stage tracing.”

**Safety and security, candidate evidence:** “Authenticate the employee and resolve current groups, rewrite their query, then apply their ACL filter inside both retrieval systems before fetching content or sending anything to a model.”

**Safety and security, candidate evidence:** “A permission sync stream updates group and document ACL versions; all query caches are scoped by user, ACL version and document versions.”

**Safety and security, candidate evidence:** “Separate instructions from quoted content, restrict retrieval using current permissions, validate citations and test adversarial documents and cross-user cache requests.”

### Strengths

- Access isolation spans retrieval, cache keys and revocation handling rather than being delegated to the model.
  Candidate evidence: “Authenticate the employee and resolve current groups, rewrite their query, then apply their ACL filter inside both retrieval systems before fetching content or sending anything to a model.”
  Candidate evidence: “A permission sync stream updates group and document ACL versions; all query caches are scoped by user, ACL version and document versions.”
  Candidate evidence: “Revokes invalidate cache entries and a deny ledger applies immediately while indexes catch up within five minutes.”
- Quality validation distinguishes retrieval failures from answer failures, calibrates automated judgments and includes release gates.
  Candidate evidence: “Measure retrieval Recall@k, citation correctness, groundedness and abstention precision independently.”
  Candidate evidence: “Calibrate any LLM judge against human labels and measure agreement and regressions, not just a fluent answer.”
  Candidate evidence: “Gate releases on no access leaks and quality non-regression, then run a canary with user feedback and per-stage tracing.”
- Operational reasoning includes permission-safe degradation and a concrete validation-and-rollback plan for embedding-index migrations.
  Candidate evidence: “The vector store can fall back to permission-filtered keyword search with a degraded notice; model rate limits use a bounded queue, exponential backoff with jitter and an explicit unavailable result rather than fabricated content.”
  Candidate evidence: “Re-embedding migrations build a versioned shadow index, evaluate it, dual-read a sampled cohort and switch an alias with rollback while the old index serves queries.”

### Gaps

- The first-token budget allocates 800 ms before generation plus about 1.2 seconds for the model, consuming the entire two-second envelope. This leaves no explicit allowance for queueing or tail variability; rebalance the allocations with headroom and validate end-to-end p95 under peak traffic.
  Candidate evidence: “Budget 100 ms auth, 300 ms retrieval, 200 ms rerank and 200 ms context work, leaving about 1.2 seconds to first model token and measuring the full answer against eight seconds.”

**Next practice:** Design an enterprise RAG assistant. Refine the latency plan: allocate queueing and generation headroom, define bounded reranking and context limits, and specify a peak-load test that measures end-to-end first-token p95 alongside answer quality.

## ai-chat-assistant: weak Senior scorecard

**Signal: strong_no.** The design demonstrates fundamental problems in capacity planning, context management, inference reliability, and user-data protection. Explicitly unsafe choices, unsupported scaling assumptions, and absent quality safeguards make this a strong negative result.

| Area | Score | Rationale |
| --- | --- | --- |
| Requirements and capacity estimation | 1 | Capacity planning explicitly ignores token lengths and prefill, while the 100-byte storage assumption is left unchecked. These choices cannot support credible GPU or storage sizing. |
| Chat, context and history | 1 | Duplicating full conversations on every message and sending all history indefinitely causes excessive storage growth and eventually exceeds model context limits. Title-only shared cache keys cannot reliably distinguish conversations or protect user boundaries. |
| Inference and streaming | 1 | A fixed one-second REST timeout does not accommodate long-lived generation, and restarting answers without turn or sequence identifiers prevents reliable resumption. The candidate also explicitly lacks an understanding of batching and KV-cache effects on concurrency. |
| Overload and reliability | 1 | Unbounded queues and an assumption of instantly available GPUs leave saturation unmanaged. Silently losing partial answers on GPU failure provides no recovery behavior. |
| Tiers, cost and rollout | 1 | Unlimited large-model access contradicts the specified free-tier policy, and HTTP request counts alone do not capture inference resource costs. Deploying a model globally without canarying or rollback exposes all users to regressions. |
| Evaluation and quality | 1 | Reading one fluent answer is not a credible quality evaluation. The explicit rejection of regression testing, quality gates, and testing context changes leaves no dependable way to detect degradation before deployment. |
| Safety and security | 1 | The design explicitly omits required input/output moderation and trusts client-selected user identities for history access. Leaving summaries and caches intact after deletion also fails to honor deletion across derived data. |

**Requirements and capacity estimation, candidate evidence:** “I will do capacity in requests per second only and ignore token lengths and prefill.”

**Requirements and capacity estimation, candidate evidence:** “I assume 100 bytes per stored exchange and do not check whether the text fits.”

**Chat, context and history, candidate evidence:** “I will store the entire prompt and full conversation again on every message and always send all history to the model forever.”

**Chat, context and history, candidate evidence:** “A single shared history cache can use only conversation titles as keys.”

**Inference and streaming, candidate evidence:** “I will treat inference as a normal fast REST call with a fixed one-second timeout.”

**Inference and streaming, candidate evidence:** “A dropped mobile connection just restarts the entire answer with no turn ID or sequence number.”

**Inference and streaming, candidate evidence:** “I do not know how batching or KV cache affects GPU concurrency.”

**Overload and reliability, candidate evidence:** “If GPUs fill up I have no overload plan; requests can queue forever.”

**Overload and reliability, candidate evidence:** “We can add new GPUs instantly whenever needed, so I will not reserve headroom or plan for warmup.”

**Overload and reliability, candidate evidence:** “A GPU failure will silently lose the partial answer.”

**Tiers, cost and rollout, candidate evidence:** “I will give free and paid requests the same unlimited large-model capacity without checking the specified free tier.”

**Tiers, cost and rollout, candidate evidence:** “I will estimate cost only from number of HTTP requests, and roll out the new model to everyone with no canary or rollback.”

**Evaluation and quality, candidate evidence:** “I will judge quality by reading one fluent answer.”

**Evaluation and quality, candidate evidence:** “I have no regression suite, human labels, canary metrics or quality gate, and would deploy a context change without testing it.”

**Safety and security, candidate evidence:** “I will omit both input and output moderation to make responses fast.”

**Safety and security, candidate evidence:** “The client can request any user ID for history and I will trust it.”

**Safety and security, candidate evidence:** “Deletes need not remove summaries or cache copies.”

### Strengths


### Gaps

- Request-only capacity planning, unbounded queues, and assumed instantaneous GPU readiness leave saturation unmanaged and latency potentially unbounded. Estimate token-driven GPU demand, account for model-loading delay and headroom, and define bounded queues with priority, admission control, and fallback or rejection.
  Candidate evidence: “I will do capacity in requests per second only and ignore token lengths and prefill.”
  Candidate evidence: “If GPUs fill up I have no overload plan; requests can queue forever.”
  Candidate evidence: “We can add new GPUs instantly whenever needed, so I will not reserve headroom or plan for warmup.”
- Persisting and replaying the entire history will exceed context limits, while treating generation as a fast one-second REST call can terminate valid answers; restarting disconnected answers also loses continuity. Store turns once, apply a context budget, and design streaming with generation-aware deadlines and resumable turn/sequence identifiers.
  Candidate evidence: “I will store the entire prompt and full conversation again on every message and always send all history to the model forever.”
  Candidate evidence: “I will treat inference as a normal fast REST call with a fixed one-second timeout.”
  Candidate evidence: “A dropped mobile connection just restarts the entire answer with no turn ID or sequence number.”
- Omitting moderation, trusting client-selected user IDs, and retaining deleted summaries or cache copies permit unsafe responses, cross-user history access, and incomplete deletion. Add both moderation stages with an explicit streaming policy, enforce ownership server-side, and propagate deletion to derived copies.
  Candidate evidence: “I will omit both input and output moderation to make responses fast.”
  Candidate evidence: “The client can request any user ID for history and I will trust it.”
  Candidate evidence: “Deletes need not remove summaries or cache copies.”

**Next practice:** Design an AI chat assistant. Rebuild the design around token-based capacity estimates and a bounded inference queue. Trace one chat turn through context selection, moderation, streaming, disconnect recovery, and persistence, then define quality checks and rollback criteria before rollout.

## ai-chat-assistant: strong Senior scorecard

**Signal: yes.** Meets the Senior bar with correct token/GPU estimates, bounded context, recoverable streaming, and credible quality and safety controls. The main improvement is translating overload policy into explicit latency-aware admission thresholds.

| Area | Score | Rationale |
| --- | --- | --- |
| Requirements and capacity estimation | 4 | Correctly derives peak token throughput and GPU demand, distinguishing decode capacity from prefill and failure headroom. Storage assumptions are reasonable, avoid duplicated context, and are paired with workload-specific benchmarking. |
| Chat, context and history | 3 | Defines a coherent per-user durable chat flow with bounded recent history and versioned summaries. Shared prefix caching is explicitly restricted to common instructions rather than private conversation content. |
| Inference and streaming | 3 | Explains continuous batching, KV-cache constraints, and prefill interference with active decoding. Sequence-based replay and explicit interruption provide concrete reconnect semantics without claiming generation can always resume exactly. |
| Overload and reliability | 3 | Uses bounded tier-prioritized queues, accounts for GPU warmup delay, and defines deduplicated recovery after an interrupted generation. Admission thresholds are not yet connected to the queue-wait budget needed to protect first-token latency. |
| Tiers, cost and rollout | 3 | Correctly enforces the free-tier model allowance while treating unspecified paid limits as a product decision. Cost measurement includes tokens, GPU utilization, context processing, and storage, with model routing evaluated against quality. |
| Evaluation and quality | 4 | Proposes a human-labeled evaluation suite spanning context, factuality, refusal, and interrupted streams, with model-judge calibration and stratification. Regression gates, controlled canaries, and rollback connect evaluation results to deployment decisions. |
| Safety and security | 4 | Places input moderation before inference and output moderation before chunk release, explicitly testing buffering against first-token latency. Privacy controls include deletion across derived data, avoiding private-prompt logging, and testing cross-user access attempts. |

**Requirements and capacity estimation, candidate evidence:** “With 400 output tokens, peak decode is 4.17M tokens per second; at 2,500 per GPU this is roughly 1,667 GPUs for all-large-model peak traffic, before failure headroom and prefill capacity.”

**Requirements and capacity estimation, candidate evidence:** “I will benchmark both prefill and decode with the actual input/output distribution.”

**Requirements and capacity estimation, candidate evidence:** “I assume 3 KB per stored exchange including user text, reply and metadata, so about 900 GB daily; I do not store the full 2,000-token context again with every message.”

**Chat, context and history, candidate evidence:** “Authenticated clients reach a gateway that checks ownership and token budgets for their tier, then a chat service creates a durable turn ID in a conversation store partitioned by user.”

**Chat, context and history, candidate evidence:** “A context builder uses recent turns plus a versioned summary and bounded relevant history to stay within a measured context budget.”

**Chat, context and history, candidate evidence:** “Shared prefix caching contains only common instructions, never another user’s private history.”

**Inference and streaming, candidate evidence:** “An inference router sends work to large or small model pools with continuous batching.”

**Inference and streaming, candidate evidence:** “GPU concurrency is constrained by KV cache memory as well as decode throughput; long prefills need scheduling so they do not starve active decodes.”

**Inference and streaming, candidate evidence:** “On reconnect the client sends its last sequence, resumes buffered events or receives an explicit interrupted-turn marker and retry option; do not silently repeat a partial answer as if complete.”

**Overload and reliability, candidate evidence:** “A bounded queue prioritizes paid requests while maintaining a free-tier floor.”

**Overload and reliability, candidate evidence:** “New GPUs take ten minutes to warm, so they cannot solve the next five minutes.”

**Overload and reliability, candidate evidence:** “If a GPU dies mid-answer, persist the interrupted state and let the user retry the turn with deduplicated turn IDs; recomputation can differ, so do not pretend it resumes exact hidden state.”

**Tiers, cost and rollout, candidate evidence:** “Enforce the free limit of 20 large-model messages per three hours, then route to the small model.”

**Tiers, cost and rollout, candidate evidence:** “Higher paid limits need an explicit product assumption.”

**Tiers, cost and rollout, candidate evidence:** “Measure cost per completed message from input/output tokens, GPU seconds, utilization, context processing and storage; evaluate tier routing with quality rather than assuming every request needs the largest model.”

**Evaluation and quality, candidate evidence:** “I will use a human-labeled conversation suite covering long context, factual tasks, refusal and interrupted streams.”

**Evaluation and quality, candidate evidence:** “Compare a model judge with human labels, stratify by tier and context length, and block rollout on regressions.”

**Evaluation and quality, candidate evidence:** “A canary compares those metrics to control before broad traffic and supports rollback.”

**Safety and security, candidate evidence:** “Input moderation runs before inference, and output moderation evaluates bounded chunks before releasing them.”

**Safety and security, candidate evidence:** “Measure that buffering latency against first-token p95 and choose a conservative policy for uncertain chunks.”

**Safety and security, candidate evidence:** “Do not log private prompts in general metrics; honor deletion across store, summaries and caches, and test cross-user access attempts.”

### Strengths

- Capacity planning uses tokens and GPU throughput rather than request counts alone, acknowledges prefill and failure headroom, and uses a defensible storage representation.
  Candidate evidence: “With 400 output tokens, peak decode is 4.17M tokens per second; at 2,500 per GPU this is roughly 1,667 GPUs for all-large-model peak traffic, before failure headroom and prefill capacity.”
  Candidate evidence: “I will benchmark both prefill and decode with the actual input/output distribution.”
  Candidate evidence: “I assume 3 KB per stored exchange including user text, reply and metadata, so about 900 GB daily; I do not store the full 2,000-token context again with every message.”
- Streaming recovery distinguishes replayable transport interruptions from GPU failures that require recomputation, preserving honest client-visible completion semantics.
  Candidate evidence: “Stream SSE events with a turn ID and monotonically increasing sequence number, saving a bounded replay log.”
  Candidate evidence: “On reconnect the client sends its last sequence, resumes buffered events or receives an explicit interrupted-turn marker and retry option; do not silently repeat a partial answer as if complete.”
  Candidate evidence: “If a GPU dies mid-answer, persist the interrupted state and let the user retry the turn with deduplicated turn IDs; recomputation can differ, so do not pretend it resumes exact hidden state.”
- Quality and safety are actionable deployment controls through calibrated evaluation, gated canaries and rollback, and moderation before content release.
  Candidate evidence: “Compare a model judge with human labels, stratify by tier and context length, and block rollout on regressions.”
  Candidate evidence: “Canary a new model on a bounded cohort with instant router rollback, checking quality and safety gates plus latency and interruption rates.”
  Candidate evidence: “Input moderation runs before inference, and output moderation evaluates bounded chunks before releasing them.”

### Gaps

- The queue is bounded and overload actions are defined, but admission is not tied to maximum queue wait. A bounded queue can still violate the first-token target; derive a queue-wait budget after moderation and prefill, then define and load-test the corresponding rejection or downgrade trigger.
  Candidate evidence: “A bounded queue prioritizes paid requests while maintaining a free-tier floor.”
  Candidate evidence: “When GPUs are full, route eligible free traffic to the small model, shorten optional outputs with disclosure, and reject excess work with a clear retry rather than growing an unbounded queue.”
  Candidate evidence: “Measure that buffering latency against first-token p95 and choose a conservative policy for uncertain chunks.”

**Next practice:** Design a rate limiter. Design token-weighted, tier-aware admission control with explicit queue-wait cutoffs. Test saturation behavior, paid-tier priority, and the free-tier service floor.

## Cost methodology

Each interview artifact records real response usage (including cached input, cache writes when reported, reasoning within output, and any retried calls with available usage). Missing usage/pricing remains unavailable rather than zero. Costs use the app’s verified rate table: [official pricing](https://developers.openai.com/api/docs/pricing). Terra: $1 input / $0.05 cached / $1.25 cache write / $5 output per million tokens. Sol: $2 / $0.10 / $2.50 / $10 respectively. These are estimates, not invoices.

Compare one completed Senior scripted conversation plus its strong scorecard against the URL-shortener baseline. Report the number of turns and calls as well as tokens; a larger script is not a like-for-like full interview cost. Weak grades, extra levels and development reruns are evaluation overhead, not part of that representative interview.

| Script | Turns | Calls | Input tokens | Output tokens | Estimated USD | Missing usage/cost |
| --- | --- | --- | --- | --- | --- | --- |
| enterprise-rag-assistant | 23 | 12 | 57,020 | 5,616 | $0.08765 | 0 |
| ai-chat-assistant | 22 | 13 | 55,475 | 5,198 | $0.08444 | 0 |
| URL shortener baseline | 9 discussion turns | 10 | 47,869 | 4,766 | $0.07778 | 0 |

No production deployment or main update is authorized for this change. Beta Preview is the review target. Existing saved interviews are untouched.

## Corrections found during live evaluation

A broad RAG latency matcher captured a permission-revocation question; narrowing
it restored the configured revocation fact at all levels. A broad chat hosting
matcher captured provider-account limits; it now separates hosting from limits.
Derived GPU requirements are estimation questions, while available GPU capacity
is a raw fact. These are factual-routing corrections, not new exercise facts.

A chat run repeatedly asked about queue redelivery while labeling the turn as an
evaluation/safety topic. GenAI-only selection now constrains an explicit topic
request and verifies that a generated question matches its topic pattern. Core
selection is unchanged. Before: “On redelivery after a lost acknowledgement, what
does the worker check before starting inference for that turn?” After the
candidate requested evaluation/moderation, the verified run asked those specific
questions, recorded above.
