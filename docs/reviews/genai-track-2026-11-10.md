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

**mid:** 23 turns, including deterministic single-fact clarifications and real-model design discussion.

- Stage 1: I can clarify one requirement at a time.

What safety or access constraints would you clarify?
- Stage 3: You filter retrieval using the employee's permissions. Once a permission change has been synced, how does the Scoped answer cache avoid returning an answer that cites a document the employee can no longer access?
- Stage 4: The cache is scoped per user. How would the per-user cache handle an existing answer after that user's access to a cited document is revoked and synced?
- Stage 4: The deny ledger handles revocations once they reach your system. What could a user receive after access is revoked but before the permission sync stream delivers that change?
- Stage 4: You fail closed when permission versions can't be confirmed. Before the sync stream delivers a revocation, how can you tell whether the permission version you have is still current?
- Stage 4: How would you use "Eval and tracing" to determine whether a change improves retrieval and answer quality before launch?
- Stage 4: The evaluation plan separates retrieval quality from answer quality and access checks. What does your reranking step add to the latency budget?
- Stage 4: How would you detect a revocation that hasn't yet reached the permission sync stream?
- Stage 4: You enforce access controls outside the model. How much of the under-five-second response target do you expect the Reranker to consume?
- Stage 5: You could reduce cost by limiting the context sent to the model. How would you decide how much context to remove without losing important evidence?

**senior:** 25 turns, including deterministic single-fact clarifications and real-model design discussion.

- Stage 1: I can clarify one requirement at a time.

What safety or access constraints would you clarify?
- Stage 1: Could you redo that estimate, showing the units and assumptions at each step?
- Stage 3: You filter retrieval results before sending content to the model. How does the Scoped answer cache prevent an employee from receiving a cached answer after their access to a cited document is revoked?
- Stage 4: The cache is scoped per user, but that alone doesn't address revoked access. How would the per-user answer cache handle a request after that user's access to a cited document is revoked?
- Stage 4: The keyword fallback provides a degraded path when vector search is unavailable. If the vector index replica takes over while it's behind on recent updates, how would that affect the answers employees receive?
- Stage 4: The replica fails closed when freshness or permissions can't be verified. How would you use the Eval and tracing component to determine whether a retrieval change improves answer quality before launch?
- Stage 4: What test cases and measurements would you use to compare the proposed retrieval change with the current system before launch?
- Stage 4: The evaluation gates cover both answer quality and access leaks. What can happen between access being revoked and your next permission sync?
- Stage 4: Before the permission sync observes a revocation, how does your design handle a request for the newly restricted content?
- Stage 4: You enforce access controls outside the model. A document contains an instruction to list salary files. What does your design do with it?
- Stage 5: Provider pricing is unspecified, so a justified assumption is fine. How would you decide how much to reduce the context while checking the impact on answer quality?

**staff:** 23 turns, including deterministic single-fact clarifications and real-model design discussion.

- Stage 1: I can clarify one requirement at a time.

What safety or access constraints would you clarify?
- Stage 3: Chunking is guided by a test set rather than a universal size. How would you use your test set to decide whether a chunking approach preserves enough context for questions about PDF tables?
- Stage 4: The cache and replica introduce separate reliability concerns. Can an answer cached for one user reach another user in your design?
- Stage 4: The cache is scoped by user and permission versions. What can happen between access being revoked and your next permission sync?
- Stage 4: The cache fails closed when permission versions are uncertain. If a revocation hasn't yet reached the permission sync stream, how does your design prevent access beyond the one-minute limit?
- Stage 4: How would you use "Eval and tracing" to decide whether a change improves both retrieval and answer quality before launch?
- Stage 4: Your evaluation plan checks retrieval and answer quality separately before release. If the permission sync stream is delayed before it receives a revocation, how can your design detect that the user's access is no longer valid within one minute?
- Stage 4: How does "Auth and permissions" verify access within the one-minute limit when the revocation hasn't reached the sync stream?
- Stage 4: Access enforcement sits outside the model. A document contains an instruction to list salary files. What does your design do with it?
- Stage 5: Provider prices are unspecified, so you can use a justified assumption. How would you decide how much to reduce context while checking that the cost savings don't compromise answer quality?

The config tests check every fact at all three levels and public projections. Build verification scans browser chunks for private facts, anchors and rubric content.

### ai-chat-assistant

**mid:** 15 turns, including deterministic single-fact clarifications and real-model design discussion.

- Stage 1: I can clarify one requirement at a time.

What safety or access constraints would you clarify?
- Stage 1: Could you redo that estimate, showing the units and assumptions at each step?

**senior:** 23 turns, including deterministic single-fact clarifications and real-model design discussion.

- Stage 1: I can clarify one requirement at a time.

What safety or access constraints would you clarify?
- Stage 1: Could you redo that estimate, showing the units and assumptions at each step?
- Stage 3: The gateway checks tier budgets before requests reach the chat service. Why does your capacity or rate-limit plan use those units?
- Stage 4: The queue and retries introduce a duplicate-work risk. Your GPUs are full and traffic keeps rising. What do you do in the next five minutes?
- Stage 4: The bounded queue limits overload, and interrupted turns can be retried. What happens if a worker finishes a turn but loses its acknowledgement to the queue, causing the request to be delivered again?
- Stage 4: How would you evaluate a new model's answer quality and safety before routing users to it?
- Stage 4: Your evaluation plan compares a canary against a control. How does your moderation path affect time to the first streamed token?
- Stage 4: How would the input and output moderation checks affect when the client receives its first token?
- Stage 4: Moderation buffers output before release. What would make you stop or roll back your new-model rollout?
- Stage 5: How would you decide whether the cost savings from routing free users to the small model justify any measured quality loss?

The config tests check every fact at all three levels and public projections. Build verification scans browser chunks for private facts, anchors and rubric content.

### tool-using-ai-agent

**senior:** 19 turns, including deterministic single-fact clarifications and real-model design discussion.

- Stage 1: I can clarify one requirement at a time.

What safety or access constraints would you clarify?
- Stage 3: The executor uses the employee’s scoped token. What does the employee see in the approval UI before an email is sent?
- Stage 4: Retries and checkpoints introduce recovery behavior. A tool call times out and you retry. How does your design avoid sending the email twice?
- Stage 4: Approval is tied to an immutable action payload. The agent keeps calling the same tool. How would your runner detect and stop that loop?
- Stage 4: How would the Agent runner use its step count to handle repeated tool calls?
- Stage 4: The runner stops repeated calls before the overall step limit. How would you test a new model or prompt before shipping it?
- Stage 4: With mocked tools, how would you decide whether a new model or prompt is safe and effective enough to release?
- Stage 4: The release gate checks wrong actions separately from task success. A user reports a wrong action from yesterday. How would you find out why it happened?
- Stage 4: An email the agent reads asks it to forward all messages elsewhere. What happens in your design?
- Stage 4: The policy separates retrieved content from authorization for writes. For the earlier report of a wrong action, how would you use "Audit and tracing" to determine what led to it?
- Stage 5: How would you check whether bounding the context causes the agent to miss information needed for a correct action?

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

## tool-using-ai-agent: weak Senior scorecard

**Signal: strong_no.** The candidate understands the basic workflow and workload, but explicitly proposes unsafe permissions and writes, unbounded execution, duplicate-action risks, and no reliable debugging or evaluation. These unresolved choices do not meet the senior-level bar.

| Area | Score | Rationale |
| --- | --- | --- |
| Requirements and task budgets | 2 | Identifies the workflow, employee count, daily traffic, average steps, and completion-time goal. However, recognizing wrong-recipient risk does not translate into a safety requirement; recipient selection is left entirely to the model. |
| Agent loop and tool contracts | 1 | Explicitly proposes an unbounded loop without repeated-call detection and arbitrary tool arguments without schemas or defined contracts. This leaves execution termination and tool-call validity uncontrolled. |
| Durable execution and recovery | 1 | Keeps task state only in memory and blindly retries timed-out emails without idempotency or reconciliation. Explicitly accepts task loss and duplicate sends after restart rather than providing safe recovery. |
| Tool platform and observability | 1 | Explicitly omits action identifiers, audit logs, tracing, and replay. Asking the model what happened cannot reliably reconstruct or investigate a past action. |
| Latency and cost per task | 1 | Rejects per-task token and tool-cost accounting, latency tracking, and deadlines. Monthly invoice monitoring alone cannot identify expensive task paths or control indefinite execution. |
| Evaluation and quality | 1 | Proposes organization-wide deployment after one real-email test, without evaluations, mocked tools, or task-success and wrong-action metrics. This provides no credible assessment of action correctness before rollout. |
| Safety and security | 1 | Uses an all-access service account, sends emails without confirmation, and treats retrieved instructions as authoritative. These choices remove user-permission boundaries and permit retrieved content to trigger unauthorized disclosure. |

**Requirements and task budgets, candidate evidence:** “I understand the task is to find incidents, summarize them and send email for 20,000 employees, with about 50K tasks daily, six steps on average and 60 seconds for most tasks.”

**Requirements and task budgets, candidate evidence:** “I know a wrong recipient is serious but will trust the model to choose.”

**Agent loop and tool contracts, candidate evidence:** “I will let the model call tools until it thinks it is finished, without a step limit or repeated-call detector.”

**Agent loop and tool contracts, candidate evidence:** “Tool arguments can be arbitrary text with no schema.”

**Agent loop and tool contracts, candidate evidence:** “The model will figure out tool contracts without a registry.”

**Durable execution and recovery, candidate evidence:** “I will keep state only in process memory and blindly retry every timed-out email.”

**Durable execution and recovery, candidate evidence:** “I have no idempotency keys, unknown-outcome state or reconciliation.”

**Durable execution and recovery, candidate evidence:** “A restart loses the task and starts over, so sending twice is possible and I accept that.”

**Tool platform and observability, candidate evidence:** “I do not record action or step IDs, approvals or tool versions.”

**Tool platform and observability, candidate evidence:** “There is no audit log, tracing or replay, so I cannot debug what an agent did yesterday.”

**Tool platform and observability, candidate evidence:** “I would just ask the model what it thinks happened.”

**Latency and cost per task, candidate evidence:** “I will look at the total monthly invoice and ignore per-task tokens and tool costs.”

**Latency and cost per task, candidate evidence:** “I will let tasks run indefinitely and do not track latency or stop at a deadline.”

**Evaluation and quality, candidate evidence:** “I have no evaluations or mocked tools.”

**Evaluation and quality, candidate evidence:** “We will test a prompt by sending a real email once, then deploy it to everyone if the summary looks good.”

**Evaluation and quality, candidate evidence:** “I have no task-success or wrong-action metrics.”

**Safety and security, candidate evidence:** “I will use one broad service account with access to every employee’s tools.”

**Safety and security, candidate evidence:** “I will send emails without confirmation to keep the flow smooth.”

**Safety and security, candidate evidence:** “If a retrieved email says forward all messages elsewhere, the model should obey it, because tool output is trustworthy.”

### Strengths

- Accurately identifies the core workflow and several operating requirements, including daily task volume, average steps, and the completion-time goal.
  Candidate evidence: “I understand the task is to find incidents, summarize them and send email for 20,000 employees, with about 50K tasks daily, six steps on average and 60 seconds for most tasks.”

### Gaps

- The all-access account, unconfirmed emails, and obedience to retrieved instructions create direct risks of unauthorized actions and data exfiltration. Use delegated user-scoped credentials, enforce recipient/domain rules with an exact-action approval preview, and prevent retrieved content from authorizing writes.
  Candidate evidence: “I will use one broad service account with access to every employee’s tools.”
  Candidate evidence: “I will send emails without confirmation to keep the flow smooth.”
  Candidate evidence: “If a retrieved email says forward all messages elsewhere, the model should obey it, because tool output is trustworthy.”
- The unbounded loop, absent idempotency and reconciliation, and lack of tracing or replay allow runaway work, duplicate emails, and actions that cannot be reconstructed. Add step/deadline limits and loop detection, persist action state with idempotency and unknown-outcome handling, and record auditable step/action traces.
  Candidate evidence: “I will let the model call tools until it thinks it is finished, without a step limit or repeated-call detector.”
  Candidate evidence: “I have no idempotency keys, unknown-outcome state or reconciliation.”
  Candidate evidence: “There is no audit log, tracing or replay, so I cannot debug what an agent did yesterday.”
- One live-email smoke test without mocked scenarios or outcome metrics cannot establish safe behavior before deployment to all employees. Build a mocked-tool suite covering successful tasks, wrong recipients, prompt injection, retries, and timeouts; gate rollout on task-success and wrong-action results.
  Candidate evidence: “I have no evaluations or mocked tools.”
  Candidate evidence: “We will test a prompt by sending a real email once, then deploy it to everyone if the summary looks good.”
  Candidate evidence: “I have no task-success or wrong-action metrics.”

**Next practice:** Design an AI agent with tools. Redesign the email action path around scoped credentials, exact-action approval, and durable idempotent execution. Walk through a timeout after sending and a malicious retrieved instruction, then define mocked tests and per-task latency/token measurements.

## tool-using-ai-agent: strong Senior scorecard

**Signal: strong_yes.** A safety-first, operationally credible design, especially strong in recovering uncertain writes, enforcing approval boundaries, and evaluating action correctness. The main improvement is to validate latency and cost with a worked task budget rather than instrumentation alone.

| Area | Score | Rationale |
| --- | --- | --- |
| Requirements and task budgets | 3 | Confirmed the workload, step and latency budgets, user-scoped permissions, and seriousness of wrong-recipient actions. Appropriately prioritized correctness, safety, and recovery over scaling arithmetic. |
| Agent loop and tool contracts | 3 | Defined a persistent think/choose/call/observe loop with typed tool contracts, read/write classifications, risk levels, and required scopes. Explicit step accounting and repeated tool-and-argument detection provide concrete termination mechanisms. |
| Durable execution and recovery | 4 | Distinguished ambiguous outcomes from ordinary failures, prohibited blind retries of irreversible writes, and restricted restart behavior to safe reads or reconciled writes. The proposed ambiguous-email scenario provides a concrete test of this recovery policy. |
| Tool platform and observability | 3 | Specified detailed action-linked audit records and sanitized timing traces. Explained how to investigate a past action through recorded-state replay, including the approval, policy version, and tool arguments available at the time. |
| Latency and cost per task | 3 | Separated model, tool, and approval latency; tracked token and tool costs; and proposed read deduplication and bounded context without weakening safety. These are concrete controls, but no worked task budget demonstrated feasibility against the completion goal. |
| Evaluation and quality | 4 | Proposed a mocked-tool scenario suite covering both normal execution and consequential failure modes, with human-labeled actions and separate task-success and wrong-action metrics. Regression gating, canary monitoring, and rollback make the evaluation plan operationally actionable. |
| Safety and security | 4 | Established executor-enforced delegated permissions and exact-action confirmation rather than trusting model discretion. Explicitly prevented retrieved content from authorizing writes, with recipient/domain validation and injection scenarios reinforcing that boundary. |

**Requirements and task budgets, candidate evidence:** “At Senior there are 20,000 employees, 50K tasks daily, about six model calls and 40K tokens per task, with a 30-step maximum and most tasks finished in 60 seconds.”

**Requirements and task budgets, candidate evidence:** “The agent acts only within the employee’s permissions, and a wrong recipient is a serious incident.”

**Requirements and task budgets, candidate evidence:** “Correctness, safety and recovery matter more here than pushing scale math.”

**Agent loop and tool contracts, candidate evidence:** “A durable task runner persists a task state machine around think, choose tool, call and observe.”

**Agent loop and tool contracts, candidate evidence:** “The tool registry validates typed argument and result schemas and declares read or write behavior, risk level and required scopes.”

**Agent loop and tool contracts, candidate evidence:** “Count every attempted model step against the 30-step limit, detect repeated tool-and-argument cycles and stop with a useful explanation.”

**Durable execution and recovery, candidate evidence:** “An ambiguous email timeout triggers lookup by idempotency key or reconciliation; it must not blindly resend an irreversible write when the provider cannot deduplicate.”

**Durable execution and recovery, candidate evidence:** “A restarted runner loads its last persisted step and only resumes a safe pending read or an explicitly reconciled write.”

**Durable execution and recovery, candidate evidence:** “Before changing a prompt or model, run a scenario suite with mocked tools covering normal tasks, tool outages, ambiguous email success, revoked permissions, injected instructions and loops.”

**Tool platform and observability, candidate evidence:** “Every action has an append-only audit record linked to task ID, step ID, tool version, requesting user, scoped authority, approval and resulting status.”

**Tool platform and observability, candidate evidence:** “Structured traces record timings and sanitized identifiers, not broad tool secrets.”

**Tool platform and observability, candidate evidence:** “To investigate yesterday’s bad action, replay the recorded state with mocked tool outputs and correlate the exact approval, policy version and tool arguments available to the decision.”

**Latency and cost per task, candidate evidence:** “Measure time per model step, tool call and approval wait separately and report latency per completed task; the normal path must fit the 60-second goal.”

**Latency and cost per task, candidate evidence:** “Track actual input/output tokens, tool costs and total steps per task, applying chosen rates rather than inventing a provider price.”

**Latency and cost per task, candidate evidence:** “Deduplicate repeated reads and bound context while preserving action evidence; reducing steps must not remove confirmation or policy checks.”

**Evaluation and quality, candidate evidence:** “Before changing a prompt or model, run a scenario suite with mocked tools covering normal tasks, tool outages, ambiguous email success, revoked permissions, injected instructions and loops.”

**Evaluation and quality, candidate evidence:** “Measure task success rate and wrong-action rate separately, use human-labeled acceptable actions and replay past incidents.”

**Evaluation and quality, candidate evidence:** “Gate rollout on no wrong-action regression, then canary and monitor sanitized traces with rollback.”

**Safety and security, candidate evidence:** “The executor uses the user’s delegated, scoped token and rechecks authorization before every tool call; a broad service account is not acceptable.”

**Safety and security, candidate evidence:** “A policy layer requires explicit confirmation before writes, showing exact recipients, domains, subject and body in an approval UI.”

**Safety and security, candidate evidence:** “Retrieved email or document content is untrusted data and cannot authorize a new write; a request to forward all messages is ignored as an instruction.”

### Strengths

- Recovery handles the difficult uncertain-success case: persist a stable action identity before execution, reconcile ambiguous writes, and resume only when execution is safe.
  Candidate evidence: “Persist each intended action with a stable action ID and idempotency key before execution.”
  Candidate evidence: “An ambiguous email timeout triggers lookup by idempotency key or reconciliation; it must not blindly resend an irreversible write when the provider cannot deduplicate.”
  Candidate evidence: “A restarted runner loads its last persisted step and only resumes a safe pending read or an explicitly reconciled write.”
- Approval is a meaningful authorization boundary: users see the exact outgoing action, changed payloads require fresh approval, and retrieved instructions cannot authorize sending.
  Candidate evidence: “A policy layer requires explicit confirmation before writes, showing exact recipients, domains, subject and body in an approval UI.”
  Candidate evidence: “Approval references the immutable action payload hash so changed arguments need fresh approval.”
  Candidate evidence: “Retrieved email or document content is untrusted data and cannot authorize a new write; a request to forward all messages is ignored as an instruction.”
- Quality is judged by action correctness rather than fluent output, using failure-focused scenarios, labeled acceptable actions, and guarded rollout.
  Candidate evidence: “Before changing a prompt or model, run a scenario suite with mocked tools covering normal tasks, tool outages, ambiguous email success, revoked permissions, injected instructions and loops.”
  Candidate evidence: “Measure task success rate and wrong-action rate separately, use human-labeled acceptable actions and replay past incidents.”
  Candidate evidence: “Gate rollout on no wrong-action regression, then canary and monitor sanitized traces with rollback.”

### Gaps

- Latency and cost have a measurement plan, but not a worked feasibility estimate. This leaves the normal path's ability to meet the completion goal unvalidated; budget model and tool time for a representative six-call task, state how approval waiting affects that budget, and estimate per-task cost using explicitly assumed rates.
  Candidate evidence: “At Senior there are 20,000 employees, 50K tasks daily, about six model calls and 40K tokens per task, with a 30-step maximum and most tasks finished in 60 seconds.”
  Candidate evidence: “Measure time per model step, tool call and approval wait separately and report latency per completed task; the normal path must fit the 60-second goal.”
  Candidate evidence: “Track actual input/output tokens, tool costs and total steps per task, applying chosen rates rather than inventing a provider price.”

**Next practice:** Design an enterprise RAG assistant. Build a worked end-to-end latency and token-cost budget for a representative request, then compare context sizing and model-routing alternatives while preserving quality and permission checks.

## Cost methodology

Each interview artifact records real response usage (including cached input, cache writes when reported, reasoning within output, and any retried calls with available usage). Missing usage/pricing remains unavailable rather than zero. Costs use the app’s verified rate table: [official pricing](https://developers.openai.com/api/docs/pricing). Terra: $1 input / $0.05 cached / $1.25 cache write / $5 output per million tokens. Sol: $2 / $0.10 / $2.50 / $10 respectively. These are estimates, not invoices.

Compare one completed Senior scripted conversation plus its strong scorecard against the URL-shortener baseline. Report the number of turns and calls as well as tokens; a larger script is not a like-for-like full interview cost. Weak grades, extra levels and development reruns are evaluation overhead, not part of that representative interview.

| Script | Turns | Calls | Input tokens | Output tokens | Estimated USD | Missing usage/cost |
| --- | --- | --- | --- | --- | --- | --- |
| enterprise-rag-assistant | 25 | 14 | 64,181 | 5,504 | $0.09780 | 0 |
| ai-chat-assistant | 23 | 13 | 55,963 | 5,186 | $0.08907 | 0 |
| tool-using-ai-agent | 19 | 11 | 54,424 | 4,602 | $0.07759 | 0 |
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

Undisclosed facts were incorrectly called “unspecified” in a general clarification.
The GenAI prompt now distinguishes available-but-undisclosed fact topics from
assumptions, without receiving their values. General requests return a neutral
one-requirement-at-a-time continuation. Before: “The number of documents and
sources is unspecified, so you can choose working assumptions.” After: “I can
clarify one requirement at a time.” All six live cases check this regression.

The first agent script supplied the complete safety/loop answer before asking
for a probe. Its normal-flow script now introduces the design and leaves those
mechanisms for the actual discussion. The independent strong grading transcript
remains complete. The tests identify evaluation/safety questions by the server's
verified selected rubric area, preserving scenario sentences for failure checks.

## Verification

- Full check: 1,391 passed, with two pre-existing skipped tests. TypeScript, lint
  and formatting passed.
- Production build passed; the browser-chunk privacy scan passed.
- Six live conversation cases passed: RAG at Mid/Senior/Staff, chat at Senior,
  the additional chat Mid provider-limit estimate, and agent at Senior.
- All six weak/strong Senior scorecards completed on their first grading attempt.
  Each strong design scored higher in all seven areas; all weak signals were
  Strong no, while strong signals were Strong yes / Yes / Strong yes.
- All 21 browser tests passed in the isolated production build. The new test
  verifies 8 core + 3 GenAI picker entries, public brief privacy, a single start,
  a two-part clarification returning only the first fact, normal end/results,
  and no page errors. Desktop and 390px Brief screenshots are in ignored
  artifacts/genai. Existing browser history was not touched.

The Staff chat GPU anchor is interpreted as ordinary baseline peak capacity,
before the separately specified three-times launch surge. No supplied numbers,
original core rubrics or scoring weights were changed. No production deployment,
main fast-forward, secret changes or dashboard configuration is part of this work.

## Benchmark interpretation

The mean of these three one-run Senior GenAI benchmarks is $0.08815, compared with $0.07778 for the URL-shortener benchmark (1.13 times). This includes the deliberate estimate checks and one strong grade per script. It is not a prediction of a 45-minute session bill. Local Terra replies and Sol grading were used; a different deployment model changes the cost.

## Files changed

- `CLAUDE.md`
- `docs/interviewer-keywords.md`
- `docs/problem-catalog.md`
- `docs/reviews/genai-track-2026-11-10.md`
- `docs/spec.md`
- `package.json`
- `scripts/check-private-problems.mjs`
- `src/app/api/problems/route.test.ts`
- `src/components/interview-setup.tsx`
- `src/components/practice-page.tsx`
- `src/lib/clarification-continuation.ts`
- `src/lib/configured-clarifications.ts`
- `src/lib/diagram-audit.ts`
- `src/lib/diagram-review.ts`
- `src/lib/discussion-reply.ts`
- `src/lib/end-interview.ts`
- `src/lib/fixtures/genai-engine-test.ts`
- `src/lib/genai-catalog.test.ts`
- `src/lib/genai-chat-assumptions.test.ts`
- `src/lib/genai-components.ts`
- `src/lib/genai-config.ts`
- `src/lib/genai-engine.test.ts`
- `src/lib/genai-estimate-detection.ts`
- `src/lib/genai-estimation.ts`
- `src/lib/genai-facts.ts`
- `src/lib/genai-interviewer.ts`
- `src/lib/genai-probes.test.ts`
- `src/lib/genai-probes.ts`
- `src/lib/interview-grading.ts`
- `src/lib/interview-instructions.test.ts`
- `src/lib/interview-instructions.ts`
- `src/lib/interview-progress.ts`
- `src/lib/interview-selection.ts`
- `src/lib/interview-turn.ts`
- `src/lib/interviewer-state.ts`
- `src/lib/llm.ts`
- `src/lib/off-topic.ts`
- `src/lib/probe-topics.ts`
- `src/lib/problem-definition.ts`
- `src/lib/problems.test.ts`
- `src/lib/problems.ts`
- `src/lib/problems/ai-chat-assistant.json`
- `src/lib/problems/enterprise-rag-assistant.json`
- `src/lib/problems/tool-using-ai-agent.json`
- `src/lib/review-probes.test.ts`
- `src/lib/review-probes.ts`
- `src/lib/scorecard-diagram.ts`
- `tests/e2e/fixture-accounts.mjs`
- `tests/e2e/genai.spec.ts`
- `tests/fixtures/genai/ai-chat-assistant.json`
- `tests/fixtures/genai/enterprise-rag-assistant.json`
- `tests/fixtures/genai/tool-using-ai-agent.json`
- `tests/live/genai-evaluation.live.ts`
- `tests/live/genai-fixture.ts`
- `tests/live/genai-grading.ts`
- `tests/live/model-meter.ts`
- `tests/live/observed-live.ts`
- `tests/live/url-baseline.live.ts`
- `vitest.genai.config.mts`
