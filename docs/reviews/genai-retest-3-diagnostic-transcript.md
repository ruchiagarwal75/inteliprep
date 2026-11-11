# Complete diagnostic RAG transcript

This is the first pre-fix adaptive run with a model playing a strong Senior candidate. The conversation completed, and the isolated clock advanced to 45 minutes before ending. Grading failed the input-byte cap. That cap failure and the generic wrap-up path visible here were subsequently fixed. This is an ungraded diagnostic transcript, not a passing final benchmark. The requested final passing transcript remains blocked by provider credits.

Only the public brief, prior conversation and the candidate's own diagram reached the candidate model. No hidden rubric, facts table or expected design was supplied to it. Quiet listening turns send no interviewer text.

## Opening

```text
What would you clarify before starting your design?
```

## Minute 0.5, stage 1

Candidate:

```text
1. Which source systems are in scope, and how are access rights defined today, including document-level permissions, group membership, and private chat channels? How quickly must permission changes or revocations take effect in the assistant?

2. Should the assistant answer only when accessible sources support its claims, otherwise abstaining or asking for clarification? Must citations link to the original document, or pinpoint the supporting passage or PDF page?
```

Interviewer:

```text
5M documents from five sources: wiki, drive, tickets, chat and docs.

Removed access must apply within five minutes.

That detail isn't specified. What would you assume?
```

## Minute 1.5, stage 1

Candidate:

```text
I’d assume answers must be supported by sources the requesting employee can currently access. If evidence is insufficient or conflicting, the assistant should say so or ask for clarification. Citations should link to the original source and identify the supporting passage, message, or PDF page. The five-minute revocation requirement is a hard security constraint.

Two further requirements I’d clarify:

1. How many employees will use this, what peak query rate or concurrent usage should we support, and what response-time target matters to users?
2. Separately from permission revocations, how quickly must new, edited, or deleted content be reflected in answers? Is that freshness requirement different for chat and tickets versus longer-lived documents?
```

Interviewer:

```text
20,000 employees. 100K questions per day, with peak traffic three times the average. First token under two seconds at p95, and a full answer under eight seconds. About 2% of documents change daily; edits must appear within 15 minutes. To confirm, that detail isn't specified. Which working assumption would you use?
```

## Minute 2.5, stage 1

Candidate:

```text
I’d use a 15-minute freshness target for new and edited content across all five sources, including chat and tickets. I’d treat deletion as revocation, so deleted content must stop appearing within five minutes. Answers would use only accessible evidence, with passage-level citations, and abstain when support is insufficient.

Two remaining questions:

1. What data-handling restrictions apply? Specifically, may document content be sent to an external model provider, and are there residency, retention, or audit requirements for prompts, answers, and logs?
2. Are any categories of content prohibited from being indexed or used by the assistant even when the employee can access them in the source, such as HR records, legal matters, or credentials?
```

Interviewer:

```text
There are no data residency constraints.

That detail hasn't been specified. What assumption would you make?
```

## Minute 3.5, stage 2

Candidate:

```text
I’d assume an external model is permitted only under an approved enterprise agreement with no training on company data and no provider retention of prompts or answers. Until explicitly approved, I’d exclude credentials and restricted HR or legal collections, even if some employees can access them. No residency constraint would not imply unrestricted logging or sharing.

Two related corpus requirements would help scope retrieval and citation quality:

1. Which languages must we support, and must employees be able to ask in one language and receive answers grounded in documents written in another?
2. Must answers cover scanned PDFs, embedded images, tables, and attachments, or is machine-readable text sufficient for the initial release?
```

Interviewer:

```text
The language is English.

That detail has not been specified. Which assumption would you use?

Let's go to the whiteboard. Sketch your design, then select Ready to explain when you're ready.
```

## Minute 4.5, stage 2

Candidate:

```text
For the initial release, I’d assume machine-readable English text, including extractable PDF text and tables. Scanned PDFs and image-only attachments would be explicitly marked unsupported rather than silently treated as fully indexed.

One remaining security requirement: will employees have saved conversation histories or shared answer links? If so, must previously generated answers and citations become inaccessible within five minutes when the viewer loses access to the underlying sources? I’d assume yes for anything served by the assistant, while recognizing that we cannot retract text someone has already copied or downloaded.
```

Interviewer:

```text
Access removal must take effect within five minutes.

That detail is unspecified. What assumption would you work with?

Move to the whiteboard and sketch your design. When you're ready, choose Ready to explain.
```

## Minute 5.5, stage 2

Candidate:

```text
Two remaining requirements would help size and scope the system:

1. What are typical and maximum document sizes, and what counts as a “document” for chat: an individual message, a thread, or a channel export? Five million short messages and five million long PDFs imply very different indexing costs.

2. What are a few representative employee questions? Are we primarily finding specific policies and facts, or must we also synthesize across many sources, such as explaining a project’s history from tickets and chat?
```

Interviewer:

```text
That detail remains unspecified. Which assumption would you make?

Please use the whiteboard to sketch your design, then choose Ready to explain when you're ready.
```

## Minute 6.5, stage 2

Candidate:

```text
What availability target should the assistant meet? During an outage of one source system, is it acceptable to answer using only the remaining accessible sources, explicitly noting incomplete coverage, or must questions requiring that source be unavailable? In either case, I would withhold content whose permissions we cannot verify within the five-minute revocation bound.
```

Interviewer:

```text
That detail is not specified. What assumption would you use?

Let's move to the whiteboard. Sketch your design and select Ready to explain when you're ready.
```

## Minute 7.5, stage 2

Candidate:

```text
I’d proceed with these working assumptions, validating document sizes and traffic shape against source samples before provisioning.

**Scope and behavior**
- English, machine-readable text and extractable tables. Image-only content is marked unsupported.
- A chat document is a thread, split into chunks without crossing permission boundaries.
- Typical questions involve fact lookup or bounded synthesis, not exhaustive analysis of entire projects.
- Answers require accessible supporting passages and citations; otherwise abstain or explain conflicting evidence.
- External models require approved no-training, no-retention terms. Credentials and restricted HR/legal collections are initially excluded.
- Read-only retrieval, with no autonomous actions or tool execution from document instructions.

**Query capacity**
- Average: 100,000 questions/day ÷ 86,400 seconds/day = **1.16 queries/second**.
- Specified peak: 3 × 1.16 = **3.47 queries/second**.
- At eight seconds per answer, peak in-flight requests ≈ 3.47 × 8 = **28**. I’d initially provision 60 concurrent requests for headroom, then load-test against the p95 latency targets.
- Assuming 6,000 input and 500 output tokens/question: **600M input and 50M output tokens/day**. Model selection must satisfy latency and measured answer quality, not just token price.

**Corpus and ingestion**
- Assume 2,000 tokens/document: 5M × 2,000 = **10B source tokens**, roughly **40GB of extracted text**, excluding originals.
- Assume five overlapping chunks/document: **25M chunks**.
- At 1,536 dimensions × 2 bytes: vectors occupy **76.8GB** before index overhead. Budget roughly **300–600GB** including index overhead and replication; benchmark this.
- Changes: 5M × 2% = **100,000 documents/day**, or **1.16/second** and **200M embedding tokens/day**. Provision for a provisional 10× ingestion burst.

**Availability and security**
Assume 99.9% monthly availability, with explicitly labeled partial-source answers. Permission uncertainty overrides availability: fail closed. Target authorization freshness below two minutes, expire authorization caches within one minute, and deny affected retrieval/history access when that freshness cannot be established. Monitor the five-minute revocation bound independently of the 15-minute content-freshness target.
```

Interviewer:

```text
Your estimates and working assumptions provide a starting point for the design.

Please sketch your design on the whiteboard, then select Ready to explain once you're ready.
```

## Minute 8, stage 2

Candidate control:

```text
Start drawing
```

Interviewer:

```text
Take your time with the whiteboard. I'll hold questions while you draw. Choose Ready to explain when you're ready.
```

## Minute 9, stage 2

Candidate control:

```text
Ready to explain
```

Interviewer:

```text
Write your explanation across as many messages as you need. Choose Done explaining when you're ready for questions.
```

## Minute 10, stage 2

Candidate:

```text
The main path is browser → gateway → orchestrator → authorized retrieval → context gate → model → output gate.

**1. Authenticate and establish permissions.** The gateway validates the employee’s OIDC token. It uses the immutable employee ID, not client-supplied groups. The authorization service resolves current memberships and source ACLs from PostgreSQL, which stores versioned permission relationships, deletion tombstones, and source synchronization checkpoints. Authorization decisions expire within one minute; source freshness leases expire within two minutes. A lease is renewed only after a successful permission synchronization, not merely a connector heartbeat. Expired leases exclude that source.

**2. Retrieve accessible candidates.** The orchestrator embeds the question and requests parallel BM25 and vector searches in OpenSearch. Both apply authorization filters before returning passages. Reciprocal-rank fusion combines exact-term and semantic matches; a reranker reduces roughly 100 candidates to 8–12 passages within a 6,000-token input budget. These are initial tuning values. If filtering leaves insufficient evidence, we abstain rather than broaden permissions.

**3. Validate exact evidence.** OpenSearch stores chunk text, document/version IDs, ACL references, and passage coordinates. Encrypted S3 holds versioned extracted content. The context gate batch-authorizes selected document versions, checks tombstones and freshness, and loads their passages. This second check protects against stale index permissions and concurrent deletion. Denied passages never enter the model prompt.

**4. Generate and release.** The approved enterprise model receives the question and numbered passages, explicitly treated as untrusted data, with no action tools. It must cite passage IDs or report insufficient evidence. The output gate buffers sentence-sized units, validates citation IDs and supporting evidence, and rechecks authorization before release. Unsupported sentences are withheld; uncertain support triggers abstention. Automated support checking is imperfect, unlike the deterministic access gate. Retrieval and initial validation target roughly one second, leaving the remaining first-token budget for model startup and buffering; benchmarking must validate this tradeoff.

**5. Preserve access controls after answering.** Encrypted history stores the answer plus its complete source/version dependency set. History and citation reads reauthorize those dependencies. If any dependency is denied or unverifiable, we withhold the entire saved answer. Previously delivered text cannot be retracted.
```

Interviewer:

Quiet listening, no text delivered.

## Minute 11, stage 2

Candidate:

```text
To finish, I’d emphasize three boundaries and the rules that cross them.

**Source to index.** Every chunk carries a source ID, document ID, immutable content version, ACL reference, and passage coordinates. Workers stage all chunks before publishing a searchable version, so retrieval cannot mix old and new passages. Events are idempotent and version-checked; delayed updates cannot overwrite newer versions or resurrect deleted documents. Deletion tombstones and permission restrictions take precedence over content ingestion.

**Index to model.** OpenSearch is a candidate generator, not the authorization authority. The context gate checks the exact selected versions against PostgreSQL-backed authorization before any passage reaches the external model. Document text cannot change system instructions or invoke tools. Provider approval covers both generation and embeddings; application telemetry excludes raw passages, prompts, and answers by default.

**Model to employee.** Citation IDs must resolve only to supplied evidence, and citation reads go through our gateway rather than exposing S3 objects. Follow-up questions also reauthorize prior context before sending it to the model. Saved answers inherit the complete dependency set, not merely the sources the model chose to cite.

One security prerequisite needs explicit validation: a successful connector poll must establish a complete authorization checkpoint, including nested groups and private-channel changes. A heartbeat is insufficient. With a two-minute checkpoint lease, decisions cached for at most one minute and bounded by that lease, and release-time checks, stale permissions should stop being usable within five minutes. If a source cannot provide bounded, complete permission synchronization or authoritative live checks, I would exclude it until that gap is resolved. I’d test revocations end to end using synthetic users and alert well before the five-minute limit.

**The deliberate tradeoff is availability versus confidentiality.** An expired source authorization lease excludes that source even if its content index is healthy. We can still answer from independently authorized sources, clearly labeling incomplete coverage, but never imply exhaustive results. That sacrifices some useful answers during connector failures; it is preferable to treating stale permissions as permission to disclose.
```

Interviewer:

Quiet listening, no text delivered.

## Minute 12, stage 3

Candidate control:

```text
Done explaining
```

Interviewer:

```text
How would you choose the chunk size for the content workers, given the mix of chat threads and documents?
```

## Minute 13, stage 3

Candidate:

```text
I’d use structure-aware chunking with different defaults for documents and chat, then tune them against retrieval quality and latency. Chunk sizes are measured in tokens using the embedding model’s tokenizer.

**Documents:** Start at **450 tokens**, typically 250–650, with a hard cap of 800. Split at section headings and paragraph boundaries rather than fixed character offsets. Include the title and heading path in each chunk. Use about **50 tokens of overlap** when splitting a continuous section, but none across unrelated sections. Preserve PDF page coordinates. For tables, repeat column headers and split by rows; don’t separate a value from its row label.

**Chat:** Start at **250–400 tokens** per chunk, preserving message boundaries, authors, timestamps, and reply relationships. Keep a short thread together. Split long threads into contiguous reply groups, repeating the root question when useful and permitted. Never merge unrelated threads or cross permission boundaries. Oversized individual messages split at paragraph boundaries.

These defaults refine my earlier five-chunks-per-document sizing assumption. For a 2,000-token document, 450-token chunks with 50-token overlap yield approximately **five chunks**, before heading overhead. Actual source samples would determine the index budget.

**Selection experiment:** Compare document targets of 300, 450, and 700 tokens, plus chat-specific grouping, using identical retrieval and reranking settings. Build a held-out set of roughly **500 representative questions**, stratified by source and lookup versus synthesis, with human-labeled supporting passages. Measure:
- Supporting-evidence recall within the final **6,000-token prompt budget**.
- Answer correctness, citation precision, and unnecessary abstentions.
- p95 retrieval latency, indexing cost, and performance by source.

I’d initially require at least **90% evidence recall** and **95% citation precision** on answerable test questions, while treating any unauthorized-context inclusion as a release blocker.

Small chunks improve precise matching but can lose necessary qualifications. Large chunks preserve context but dilute retrieval and consume the prompt budget. If failures show missing adjacent context, I’d add narrowly bounded neighbor expansion, reauthorizing every added chunk, rather than increasing every chunk globally.
```

Interviewer:

```text
How would hybrid retrieval handle an employee’s question that uses different terminology from the relevant documents, and where might it still miss the evidence?
```

## Minute 14.5, stage 3

Candidate:

```text
The vector branch handles terminology mismatch; BM25 preserves exact-match strength for names, identifiers, and error codes.

For example, an employee asks, “How do I get my laptop replaced?” while the policy says “endpoint hardware refresh eligibility.” A good embedding model places those passages near each other even without shared keywords. I’d retrieve the top 100 authorized candidates from each branch, fuse their rankings using reciprocal-rank fusion, then rerank roughly 100 unique candidates down to the 8–12 passages that fit our context budget.

For fusion, I’d start with RRF score = Σ 1/(60 + rank). It avoids directly comparing incomparable BM25 and vector scores. The reranker evaluates the question and passage together, so it can favor the eligibility policy over a semantically similar laptop troubleshooting guide. It cannot recover evidence neither branch retrieved.

**Where this still misses:**
- **Internal jargon or ambiguous acronyms:** “Phoenix access” might mean a project, not a product known to the embedding model.
- **Missing context:** A chunk says “after three years,” but its heading identifying laptop replacement was lost.
- **Multi-hop questions:** One document maps a team to a service; another describes that service’s policy. Neither directly resembles the question.
- **Negation, numbers, or exceptions:** Semantic similarity can retrieve the general rule but miss an exception in a separate passage.
- **Absent evidence:** Unsupported scans, ingestion lag, or inaccessible sources cannot be fixed by ranking.

I’d first measure candidate recall on a terminology-mismatch subset of our evaluation set. For recurring acronym failures, I’d add a curated company glossary and expand the query while retaining the original. Permission-restricted aliases must remain permission-restricted. I’d add at most two parallel reformulations only if their measured recall gain justifies the latency cost against our two-second first-token target.

Every branch and expansion keeps the same authorization constraints. Low evidence coverage leads to clarification or abstention, never relaxed permissions. RRF and reranker scores indicate relevance, not proof that an answer is supported.
```

Interviewer:

```text
How do the content workers handle a Kafka event being redelivered after a worker publishes a version but loses its acknowledgement?
```

## Minute 16, stage 4

Candidate:

```text
I’d assume at-least-once Kafka delivery and make publication idempotent. The important distinction is between writing chunks and making a version visible.

Each event carries `(source_id, document_id, source_revision)`. Workers use deterministic chunk IDs derived from that identity, the extraction-pipeline version, and chunk ordinal. Retrying therefore upserts the same objects rather than creating duplicates.

**Publication protocol:**
1. Stage extracted content, embeddings, and index chunks under that immutable version. Verify a manifest containing the expected chunk count and checksums. Staged chunks are not eligible for serving.
2. In a PostgreSQL transaction, lock the document’s publication record and compare revisions. If this version is already published, return success. If a newer version or superseding deletion exists, mark this event obsolete. Otherwise, atomically advance the active-version pointer and mark the event complete.
3. Commit the Kafka offset only after that transaction succeeds.

For your specific failure, publication succeeded but the offset commit was lost. Kafka redelivers the event. The worker finds the completed publication record, performs no new publication, and commits the offset. If a newer version has since appeared, the old event cannot roll it back.

This requires a clarification to my earlier staging description: **OpenSearch is not the publication authority.** Retrieval may encounter staged or obsolete chunks, but the context gate checks every selected chunk against the authoritative active-version pointer before admitting it to the model. A publication marker in OpenSearch alone would not give atomic visibility across many chunks. Index cleanup and candidate filtering reduce that wasted retrieval work.

Concurrent duplicate workers are serialized at publication by the document lock and unique event key. A crash before publication leaves invisible staged data; a retry completes it, and a sweeper removes abandoned versions later. A committed deletion tombstone prevents delayed content events from resurrecting the document.

I would not claim exactly-once execution across Kafka, S3, and OpenSearch. This provides an effectively-once publication result, with possible repeated computation. I’d fault-inject crashes immediately before and after publication and offset commit to verify it.
```

Interviewer:

```text
If the model provider rate-limits requests during peak traffic, how does your orchestrator handle affected requests while meeting the response-time targets?
```

## Minute 17.5, stage 4

Candidate:

```text
I’d combine reserved capacity, deadline-aware admission, and graceful degradation. Retries alone would amplify the overload.

**Capacity:** Our peak is 3.47 requests/second, approximately **208 requests/minute**. At 6,000 input and 500 output tokens/request, that is **1.25M input tokens/minute** and **104K output tokens/minute**. I’d negotiate provisioned capacity with roughly 2× headroom and verify the provider’s actual request, token, and burst limits. Sixty application concurrency slots do not guarantee model capacity.

**Admission and deadlines:** Each request carries an eight-second deadline from gateway receipt. A shared limiter reserves estimated input/output tokens before calling the provider, with fair per-user limits. I’d allow at most roughly **100 ms** of model admission queuing. If capacity is unavailable, we take the fallback path rather than build a queue that guarantees missed deadlines.

**On a 429:**
- Honor `Retry-After`, but retry only once, with jitter, if the remaining first-token and completion budgets permit it.
- A multi-second backoff cannot meet our two-second first-token target, so I would not retry interactively in that case.
- Repeated throttling opens a circuit breaker for that deployment. Probe requests restore traffic gradually after recovery.

**Fallback:** Route to a preapproved, independently provisioned deployment only if it has measured capacity, equivalent privacy guarantees, and passes our grounding evaluations. It receives only the already-authorized context, with authorization checked again before release. Another deployment sharing the same quota is not meaningful redundancy.

If no qualified model capacity remains, return an explicitly labeled **extractive result**: authorized supporting passages and citations, without synthesized claims. If retrieval itself cannot finish safely, return a clear temporary-unavailability response.

I would not count a spinner or acknowledgment as meeting the first-answer-token SLO. If both model pools are exhausted, we cannot honestly guarantee normal answer latency and quality. We record the request as degraded or failed, alert on throttling and deadline misses, and use load tests to validate capacity before launch.
```

Interviewer:

```text
How much of your first-token latency budget would you allocate to the reranker?
```

## Minute 19, stage 4

Candidate:

```text
I’d allocate **150 ms at p95 to the reranker**, including its RPC and queue time, with a **200 ms hard timeout**. That is 7.5% of our two-second first-token budget.

My provisional end-to-end budget is:

| Stage | Budget |
|---|---:|
| Gateway, identity, authorization filters | 100 ms |
| Query embedding | 150 ms |
| Parallel BM25/vector retrieval and fusion | 250 ms |
| Reranking | 150 ms |
| Exact-version authorization and context loading | 150 ms |
| Model startup through first complete sentence | 800 ms |
| Initial output validation and release | 150 ms |
| Headroom | 250 ms |
| **Total** | **2,000 ms** |

These are engineering allocations, not a claim that adding stage p95s proves the end-to-end p95. I’d validate the actual critical-path distribution under peak load, including cold starts and provider variance.

For roughly 100 candidates, I’d use a compact cross-encoder on a warm, dedicated inference pool, batching candidate pairs within each request rather than waiting to batch across employees. Candidate text would be capped at our chunk limit. At 3.47 queries/second, that is approximately **347 query-passage pairs/second**, which we must benchmark on the chosen hardware.

If reranking exceeds 200 ms, the orchestrator cancels it and uses the fused retrieval ranking. Exact authorization and output checks remain mandatory. We accept potentially worse relevance, not weaker access control; insufficient supporting evidence still leads to abstention.

If benchmarks cannot meet that allocation, I’d first reduce reranking from 100 to **40 candidates**, measuring the loss in evidence recall and citation quality. I would not silently take time from authorization or output validation. The other major uncertainty is buffering the first supported sentence: the model must reach that point within the allocated 800 ms, not merely emit its first raw token.
```

Interviewer:

```text
How would you change the embedding model in your OpenSearch retrieval path without interrupting existing queries?
```

## Minute 20.5, stage 4

Candidate:

```text
I’d use a **blue-green index migration**, keeping the existing model and index serving until the replacement is ready. Changing vector dimensions or similarity behavior in place is unsafe.

**1. Create a versioned retrieval configuration.**
Bundle the embedding model ID, tokenizer, normalization, vector dimensions, similarity metric, and OpenSearch index name. Each request pins one configuration for its lifetime, so its query vector always matches its target index. Initially I’d keep chunking unchanged to isolate the embedding change.

**2. Backfill while processing live changes.**
Create a separate index with the new vector mapping. Backfill the currently published document versions from S3, while fanning live content events out to both embedding pipelines through independent durable consumers. Keys include document version, chunk ordinal, and embedding-model version, making retries idempotent.

Track completion per document version and reconcile against PostgreSQL’s active-version inventory. A backfill result for an obsolete version cannot replace newer content. Both indexes retain ACL references, and the existing context gate still checks current authorization, tombstones, and active versions. Migration never bypasses those checks.

**3. Validate before routing users.**
Require complete coverage of eligible published versions at a recorded watermark, no unexplained reconciliation gaps, and ingestion lag below 15 minutes. Evaluate terminology mismatch, exact identifiers, and source-specific questions. My initial acceptance criteria would be no more than a one-percentage-point evidence-recall regression, citation precision at least 95%, and end-to-end p95 below two seconds to first supported output.

Shadow a sampled 5% of queries, then canary at 1%, 10%, 50%, and 100%, subject to provider capacity and privacy controls. Shadow results are not returned to employees.

**4. Cut over and retain rollback.**
Atomically change the retrieval configuration pointer, not just an index alias. In-flight requests finish on their pinned configuration. Never send new-model query vectors to the old index.

Keep the old pipeline current for a seven-day observation window. Quality, latency, or freshness regressions trigger a configuration rollback. This temporarily doubles vector storage and embedding work, but avoids downtime and makes rollback practical.
```

Interviewer:

```text
If the OpenSearch vector index becomes unavailable while BM25 remains healthy, what would the employee see?
```

## Minute 22, stage 4

Candidate:

```text
The employee would get a **BM25-only answer when lexical retrieval finds sufficient evidence**, with a small notice: “Semantic search is temporarily unavailable; relevant sources may be missing.” It would still have passage-level citations and the same authorization checks.

**Detect and degrade quickly.** BM25 and vector searches run independently in parallel. An explicit vector failure immediately selects the BM25 results. A hung vector request is canceled at the retrieval stage’s 250 ms deadline, or earlier if the request’s remaining budget requires it. Repeated failures open a circuit breaker so subsequent queries do not wait for a known-unhealthy vector service.

**Keep the remaining pipeline intact.** We rerank the authorized BM25 candidates, validate exact document versions and permissions, then generate and validate the answer normally. With only one retrieval branch, fusion reduces to that branch’s ranking. We do not relax grounding requirements or interpret BM25 scores as confidence that the answer is correct.

For an exact question such as “What does error VPN-403 mean?”, the experience may be nearly unchanged. For “How do I get my laptop replaced?” when the policy only says “endpoint hardware refresh,” BM25 may miss the evidence. If the remaining passages do not support an answer, the employee sees: “I couldn’t find enough supporting evidence with search currently degraded. Try the policy or project’s exact name, or retry later.” We would not claim the policy does not exist.

**Recovery and measurement.** Probe requests test the vector path, followed by a gradual traffic ramp. I’d monitor lexical-only answer correctness, abstention rate, citation precision, and latency separately from normal hybrid operation. An outage drill against our terminology-mismatch evaluation subset establishes how much quality this fallback actually loses.

The tradeoff is continued useful service with lower recall, rather than taking all search offline. Security remains unchanged, but I would count this as degraded service, not hide it as normal availability.
```

Interviewer:

```text
The fallback preserves service but can reduce recall. During the seven-day embedding migration, how would you assess whether the extra embedding and storage cost is justified by the retrieval quality improvement?
```

## Minute 23.5, stage 4

Candidate:

```text
I’d separate **temporary migration expense** from **ongoing cost**, and require a measured quality gain. My earlier non-regression threshold establishes safety to migrate, not a business reason to migrate.

**Measure incremental cost.** Using our sizing assumptions:
- Initial re-embedding: **10B tokens**.
- Seven days of duplicate updates: 200M tokens/day × 7 = **1.4B tokens**.
- Total extra embedding work: **11.4B tokens**. At an illustrative $0.10/million tokens, that is **$1,140**. I’d substitute the vendor’s contracted rate.
- Add the second index’s actual storage, replicas, indexing compute, and shadow-query costs. Our provisional extra index budget is **300–600GB**, but provisioned OpenSearch node-hours may dominate storage charges.

Steady-state cost compares the new model’s embedding price, vector footprint, and query-serving compute against the old configuration. Initial backfill is a sunk cost once incurred; keeping both pipelines alive must still earn its incremental expense.

**Measure useful improvement.** Run paired evaluations using identical questions, source versions, authorization scope, chunking, and downstream generation. Otherwise content changes could masquerade as model improvement. Compare:
- Evidence recall within the 6,000-token context budget.
- Human-reviewed, correctly supported answer rate and unnecessary abstentions.
- Terminology-mismatch and source-specific slices.
- Citation precision, authorization failures, and end-to-end latency as guardrails.

Use the held-out 500 questions initially, plus sampled shadow traffic. Compute paired confidence intervals, clustered by question or topic. If a small gain remains statistically ambiguous, expand the evaluation rather than declare victory.

**Decision rule.** I’d initially seek at least a **two-percentage-point improvement in correctly supported answers**, with no material slice regression and all security/latency gates passing. At 100K questions/day, that represents 2,000 additional useful answers/day. If each saves an experimentally validated 30 seconds, that is **16.7 employee-hours/day**. I’d discount that estimate and compare its value with migration expense and recurring cost over a 90-day horizon.

If benefits are marginal or costs outweigh them, roll back and retire the new index. Seven days is an observation window, not a reason to adopt the model.
```

Interviewer:

```text
How does the authorization service prevent a cached authorization decision for one employee from being reused for another employee?
```

## Minute 25, stage 5

Candidate:

```text
I’d make the employee’s identity a mandatory part of every authorization cache key, derived from the validated OIDC token, never from a request parameter.

For an individual decision, the key would contain:
`(tenant_id, immutable_employee_id, source_id, document_id, content_version, action, authorization_epoch)`.

The action distinguishes reading content from other permissions. The authorization epoch identifies the relevant membership and ACL snapshot. Two employees requesting the same document therefore cannot hit the same decision entry, even if their current groups happen to match.

**Enforcement:**
- The gateway validates token signature, issuer, audience, and expiration, then passes a trusted identity context over an authenticated internal connection. It strips client-supplied identity headers.
- The authorization API requires that context. Missing identity is an error, not an anonymous or shared-cache lookup.
- Cache values also contain their subject, resource, action, and epoch. The service verifies those fields on a hit, providing defense against key-construction bugs.
- Per-user entitlement and retrieval-filter caches use the same subject isolation. An answer cache, if introduced, would still require authorization of its complete dependency set before serving.

**Freshness remains separate from isolation.** Each entry expires at the earlier of 60 seconds or its source authorization lease expiry. Membership or ACL changes advance the relevant epoch and invalidate affected entries. If invalidation delivery fails, bounded expiry and source-lease checks remain mandatory. A cache hit cannot override an expired lease or deletion tombstone.

I’d test this with Alice and Bob having opposite access to the same document: warm Alice’s allowed entry, query as Bob, and verify denial, then reverse the order. I’d also test concurrent requests, identical usernames across tenants, membership revocations, and forged identity headers.

The tradeoff is fewer shared cache hits and more authorization work. We can share immutable ACL graph data internally, but not reuse a final allow decision across employees merely because their requests look similar.
```

Interviewer:

```text
Please wrap up when ready, keeping your availability and confidentiality tradeoff in mind.
```

## Minute 26.5, stage 5

Candidate:

```text
To wrap up, I’d ship a read-only assistant that combines lexical and semantic retrieval, answers only from authorized evidence, and provides passage-level citations. When evidence is insufficient, it abstains rather than inventing an answer.

The central security boundary is the authorization service, not OpenSearch or the model. Every passage is checked against its exact published version before entering the model, and permissions are checked again before releasing output. Saved answers and follow-up context inherit the complete source dependency set and are reauthorized on access. Authorization decisions are isolated by employee identity.

The deliberate tradeoff is **availability versus confidentiality**. If vector search or the model fails, we can offer clearly labeled lexical-only or extractive results. If permission freshness cannot be established, we exclude the affected source, even when its content remains searchable. We cannot retract text already delivered, but we must stop subsequent disclosure within five minutes of revocation.

Before launch, I’d require three demonstrations:
1. End-to-end revocation tests, including nested groups, private channels, cached decisions, history, and active streams, remain within the five-minute bound during failures.
2. Peak-load tests meet the two-second first-supported-output and eight-second completion targets, with degraded responses measured separately.
3. A representative held-out evaluation meets our evidence-recall and citation-quality gates, with no unauthorized context entering model requests.

The biggest prerequisite is whether each source can provide complete, bounded permission synchronization. If one cannot, I would exclude it rather than weaken the confidentiality promise. I’d launch in stages with sources that satisfy that prerequisite, then expand based on measured reliability and answer quality.
```

Interviewer:

```text
How would you verify that a source’s permission synchronization is complete enough to include it at launch?
```

## Minute 28, stage 5

Candidate:

```text
I’d qualify each source independently against its authoritative access checks. A connector heartbeat or successful poll is not proof of completeness.

**1. Establish the permission contract.** Document every access mechanism: direct grants, inherited ACLs, nested groups, private-channel membership, guests, explicit denies, deletion, and account suspension. Verify stable identities, pagination consistency, event ordering, cursor expiration, and upstream propagation delays. Unsupported permission semantics block launch for the affected collection.

**2. Prove snapshot-to-stream continuity.** Bootstrap from a consistent permission snapshot and consume changes from a corresponding cursor, with overlap and deduplication. Advance the authorization checkpoint only after all pages and preceding changes, including group dependencies, are committed. Cursor gaps, expired cursors, or incomplete pagination invalidate the source lease and trigger resynchronization.

My earlier lease proposal needs an important qualification: **a recently completed poll can still contain stale permissions**. Lease renewal requires evidence that the checkpoint covers changes through a sufficiently recent source time, not simply that our worker finished recently. If the source cannot provide bounded change visibility, I’d require authoritative live access checks or exclude it.

**3. Test against an independent oracle.** Use synthetic employees and documents to exercise every supported permission mechanism. Compare our authorization decisions with actual source reads under those employees’ identities. Run randomized grant/revoke sequences and fault injection: dropped events, reordered events, connector restarts, throttling, partial pagination, and nested-group changes. Any false allow is a release blocker.

**4. Measure the full revocation bound.** Timestamp the source-side change and probe retrieval, model context, streaming output, citations, and history. A provisional budget is 120 seconds for source visibility plus synchronization, 60 seconds for cached decisions, and 10 seconds for enforcement: **190 seconds**, leaving 110 seconds of margin. Validate those bounds under failures, not just normal-operation percentiles.

At launch, I’d require documented source guarantees, passing conformance tests, and continuous synthetic revocation probes. If freshness becomes unverifiable, fail closed for that source. That sacrifices availability rather than treating an unproven checkpoint as permission to disclose.
```

Interviewer:

```text
The revocation budget is consistent with your stated assumptions. Given that tests can’t cover every possible permission state, how would you decide whether the remaining risk of an unauthorized allow is acceptable for launch?
```

## Minute 29.5, stage 5

Candidate:

```text
I wouldn’t infer safety from zero failures in testing. I’d make launch a **documented security decision based on architectural assurance, bounded uncertainty, and limited exposure**.

**First, separate blockers from residual risk.** Unknown permission semantics, unbounded source propagation, incomplete group resolution, or a known false-allow defect are blockers. They are not risks I’d accept because tests usually pass. The five-minute revocation allowance also does not permit disclosing content to someone who never had access.

**Second, build an assurance case for each source.** It must explain why every serving path enforces authorization, supported by source guarantees, connector conformance tests, and independent security review. I’d explicitly examine common-mode failures: two checks against the same incorrectly synchronized ACL graph are not independent protection. Where supported, authoritative source reads under the employee’s identity provide a stronger independent check. Sources without that capability require stronger evidence for synchronization completeness or narrower launch scope.

**Third, quantify what testing actually establishes.** With zero false allows in 100,000 independent, representative denied-access checks, the approximate one-sided 95% upper bound is 3/100,000, or **0.003% per tested check**. That is not a production leakage guarantee: permission cases are correlated, rare states may be absent, and systematic bugs can evade every sample. I’d use that result to identify evidence gaps, not declare the risk acceptable numerically.

**Launch decision:** Security, source owners, and the accountable business risk owner review the threat model, unresolved assumptions, data sensitivity, and rollback controls. They accept documented residual implementation risk, not an exception to the confidentiality requirement. I would recommend a limited launch using well-understood sources and non-sensitive collections first.

Continuous synthetic probes and sampled authoritative comparisons remain active. Any confirmed unauthorized allow triggers immediate source isolation, preservation of restricted audit evidence, incident response, and investigation of the full exposure window. Re-enablement requires a demonstrated fix and regression coverage.

The tradeoff remains explicit: if assurance is inadequate, reduce coverage or delay launch rather than silently weaken confidentiality.
```

Interviewer:

```text
That gives us a clear basis for the launch decision. We’ll wrap up the interview here.

End the interview when ready, keeping the coverage and confidentiality tradeoff in mind.
```

## Minute 30, stage 5

Candidate control:

```text
Pause to draw
```

Interviewer:

```text
There's no rush with the whiteboard. I won't ask questions while you draw. When you're ready, select Ready to explain.
```

## Minute 31, stage 5

Candidate control:

```text
Ready to explain
```

Interviewer:

Quiet listening, no text delivered.

## Minute 32, stage 5

Candidate:

```text
I added the authoritative publication registry to PostgreSQL and two paths: content workers publish to that registry, and the context gate validates retrieved versions against it.

After staging all chunks and verifying their manifest, a worker atomically advances the document’s active-version pointer. Duplicate events become no-ops; older revisions cannot replace newer publications or override deletion tombstones.

The context gate rejects staged or obsolete versions even if OpenSearch returns them. This makes visibility depend on a transactional publication decision, not on partially completed index writes. The tradeoff is an additional batched registry check and potentially fewer usable search candidates during publication or cleanup, rather than serving inconsistent evidence.
```

Interviewer:

```text
Got it, you added a publication registry and validation against it at the context gate.
```

## Minute 33, stage 5

Candidate control:

```text
Done explaining
```

Interviewer:

```text
The registry favors consistency over availability during publication. How would you measure whether its added latency and rejected candidates are an acceptable tradeoff?
```

## Minute 34, stage 5

Candidate:

```text
I’d measure **security correctness, incremental latency, and evidence lost**, separating normal operation from publication bursts and failures. Rejecting an unpublished version is mandatory; the question is whether the implementation makes that protection unnecessarily expensive.

**Latency:** Trace the batched registry lookup separately from authorization and S3 reads within our 150 ms context-gate allocation. My initial target would be **under 30 ms p95 and 60 ms p99** for the registry check, including connection-pool wait. Query all selected document IDs in one indexed PostgreSQL request, not one request per chunk. Validate at our 3.47 queries/second peak, a 2× query stress load, and concurrent 10× ingestion bursts. The ultimate gate remains end-to-end p95: first supported output under two seconds and completion under eight seconds.

**Rejected candidates:** Record rejection reasons separately: staged, superseded, deleted, or authorization-denied. Measure both candidate rejection rate and the user-level consequence: did we still recover the labeled supporting evidence within the 6,000-token budget? Ten stale chunks from one document should not look like ten independent failures.

On our held-out questions, compare results using identical source snapshots with an offline reference containing only published versions. I’d initially allow no more than a **one-percentage-point evidence-recall loss or increase in unnecessary abstention attributable to publication lag**, with confidence intervals. We would never expose unvalidated results as an experimental control.

**Recovery experiments:** Crash workers before and after publication, delay index refresh, overload PostgreSQL, and interrupt cleanup. Measure how long newly published evidence remains undiscoverable and whether existing evidence disappears prematurely. No staged or obsolete passage may reach the model.

If rejection causes material evidence loss, I’d improve index cleanup and current-version filtering, then test bounded over-fetching within the latency budget. If PostgreSQL is unavailable, affected answers fail closed.

The consistency requirement is not negotiable. These measurements determine whether this implementation is acceptable, or needs optimization before launch, rather than whether to bypass the registry.
```

Interviewer:

```text
Your estimate and measurement plan provide a basis for assessing the tradeoff. We'll conclude the interview here.

Walk me through the other in your design, beginning with your first decision.
```

## Minute 35.5, stage 5

Candidate:

```text
My first decision was to make this an **evidence-grounded, read-only assistant**, rather than a general chatbot with access to company data. It answers from authorized passages, cites them, and abstains when support is insufficient.

The remaining decisions follow from that boundary:

1. **Separate permission freshness from content freshness.** Edits have a 15-minute target; revocations and deletions must stop disclosure within five minutes. Each source needs complete permission checkpoints with bounded freshness. If that cannot be established, we exclude the source rather than trust stale permissions.

2. **Use asynchronous, versioned ingestion.** Kafka absorbs changes; workers extract and chunk content, store immutable versions in S3, and build OpenSearch indexes. PostgreSQL’s publication registry makes retries safe and prevents partially indexed versions from becoming usable evidence.

3. **Combine lexical and semantic retrieval.** BM25 handles identifiers and exact terminology; vectors handle paraphrases. Fusion and reranking improve relevance, but neither establishes authorization or factual support.

4. **Enforce authorization outside the model.** The context gate checks exact published versions before sending passages to the provider. Output, citation, and history paths reauthorize their dependencies. The model never decides access rights.

5. **Degrade capability, not confidentiality.** A vector outage permits labeled BM25-only results. Model throttling permits authorized extracts. Permission uncertainty means withholding affected content, even if every other component is healthy.

The overarching tradeoff is deliberately narrower coverage and occasional abstention in exchange for a defensible confidentiality boundary. I would expand source coverage only after demonstrating permission correctness, freshness, retrieval quality, and latency under failure, not merely successful operation.
```

Interviewer:

```text
The publication decision favors consistency over coverage. If the active-version pointer advances before the new version is searchable in OpenSearch, what happens to answers that depend on that document?
```

## Minute 37, stage 5

Candidate:

```text
That creates a **temporary evidence gap**. OpenSearch may return the old version, but the context gate rejects it because it no longer matches the active-version pointer. If the new version is not searchable yet, we cannot use either version. An answer requiring that document would abstain or explicitly report insufficient evidence. Other independently supported answers can continue.

That exposes a weakness in my earlier publication sequence: staging indexed chunks does not necessarily mean they are search-visible.

I’d revise publication to require a **search-readiness barrier before advancing the pointer**:

1. Write all new-version chunks and verify the manifest.
2. Wait for OpenSearch refresh, using `refresh=wait_for` on the final bulk writes rather than forcing a refresh per document.
3. Verify through the search path that the expected chunk IDs and version are visible. A real-time document GET alone is insufficient because it can succeed before search visibility.
4. Only then transactionally advance the PostgreSQL pointer, conditional on the source revision still being current and no superseding tombstone existing.

Until that switch, the previous published version remains eligible, provided it is still authorized and within the 15-minute content-freshness requirement. **Deletion and permission restrictions take effect independently and immediately through the authorization path**, even if publication stalls.

This barrier reduces the gap but does not make PostgreSQL and OpenSearch atomic. Search shards can fail after readiness succeeds. If the active version subsequently becomes unavailable, I still withhold dependent answers rather than automatically fall back to superseded content. We alert, repair the index, and measure publication-to-discoverability lag and resulting abstentions.

The tradeoff is slightly slower publication and additional readiness checks in exchange for avoiding a predictable coverage gap. Confidentiality checks remain mandatory; we improve availability by ordering publication correctly, not by accepting obsolete evidence.
```

Interviewer:

```text
That addresses the publication gap and its availability tradeoff. We’ll conclude the interview here.

End the interview when ready, keeping the publication speed and evidence availability tradeoff in mind.
```

## Final diagram

Nodes:

- Five source APIs: wiki, drive, tickets, chat, docs
- Connectors: content reconciliation and permission synchronization
- Kafka: durable content and authorization events
- Content workers: exclusions, extraction, permission-boundary chunking, idempotent staging
- Encrypted S3: versioned extracted content and passage coordinates
- Embedding workers: approved enterprise embedding API
- OpenSearch: BM25 and vector indexes; document versions and ACL references
- Authorization workers: ACLs, groups, deletions, complete source checkpoints
- PostgreSQL: authorization graph, tombstones, freshness leases; publication registry with ⋅
- Employee browser: questions, streamed answers, citations, history
- Enterprise identity provider: OIDC authentication
- API gateway: identity validation, rate limits, deadlines
- Query orchestrator: query embedding, retrieval, bounded context assembly
- Authorization service: employee-isolated decisions, filters, batch checks; fail closed
- Hybrid retrieval: authorized BM25/vector search and reciprocal-rank fusion
- Reranker: supporting passages within token budget
- Context gate: verify active published versions, permissions, freshness, tombstones
- Approved enterprise LLM: no training or retention; read-only cited answers
- Output gate: citation/support validation, abstention, streaming authorization checks
- Encrypted history: answers and complete source dependencies
- History and citation gateway: reauthorize reads; withhold answers with denied dependencies
- Operations: latency, freshness, quality, revocation probes, alerts; redacted telemetry

Connections:

- Five source APIs: wiki, drive, tickets, chat, docs -> Connectors: content reconciliation and permission synchronization
- Connectors: content reconciliation and permission synchronization -> Kafka: durable content and authorization events
- Kafka: durable content and authorization events -> Content workers: exclusions, extraction, permission-boundary chunking, idempotent staging
- Content workers: exclusions, extraction, permission-boundary chunking, idempotent staging -> Encrypted S3: versioned extracted content and passage coordinates
- Encrypted S3: versioned extracted content and passage coordinates -> Embedding workers: approved enterprise embedding API
- Embedding workers: approved enterprise embedding API -> OpenSearch: BM25 and vector indexes; document versions and ACL references
- Kafka: durable content and authorization events -> Authorization workers: ACLs, groups, deletions, complete source checkpoints
- Authorization workers: ACLs, groups, deletions, complete source checkpoints -> PostgreSQL: authorization graph, tombstones, freshness leases; publication registry with ⋅
- Authorization workers: ACLs, groups, deletions, complete source checkpoints -> OpenSearch: BM25 and vector indexes; document versions and ACL references
- Employee browser: questions, streamed answers, citations, history -> Enterprise identity provider: OIDC authentication
- Enterprise identity provider: OIDC authentication -> API gateway: identity validation, rate limits, deadlines
- Employee browser: questions, streamed answers, citations, history -> API gateway: identity validation, rate limits, deadlines
- API gateway: identity validation, rate limits, deadlines -> Query orchestrator: query embedding, retrieval, bounded context assembly
- Query orchestrator: query embedding, retrieval, bounded context assembly -> Authorization service: employee-isolated decisions, filters, batch checks; fail closed
- PostgreSQL: authorization graph, tombstones, freshness leases; publication registry with ⋅ -> Authorization service: employee-isolated decisions, filters, batch checks; fail closed
- Query orchestrator: query embedding, retrieval, bounded context assembly -> Hybrid retrieval: authorized BM25/vector search and reciprocal-rank fusion
- Authorization service: employee-isolated decisions, filters, batch checks; fail closed -> Hybrid retrieval: authorized BM25/vector search and reciprocal-rank fusion
- OpenSearch: BM25 and vector indexes; document versions and ACL references -> Hybrid retrieval: authorized BM25/vector search and reciprocal-rank fusion
- Hybrid retrieval: authorized BM25/vector search and reciprocal-rank fusion -> Reranker: supporting passages within token budget
- Reranker: supporting passages within token budget -> Context gate: verify active published versions, permissions, freshness, tombstones
- Authorization service: employee-isolated decisions, filters, batch checks; fail closed -> Context gate: verify active published versions, permissions, freshness, tombstones
- Encrypted S3: versioned extracted content and passage coordinates -> Context gate: verify active published versions, permissions, freshness, tombstones
- Context gate: verify active published versions, permissions, freshness, tombstones -> Approved enterprise LLM: no training or retention; read-only cited answers
- Approved enterprise LLM: no training or retention; read-only cited answers -> Output gate: citation/support validation, abstention, streaming authorization checks
- Authorization service: employee-isolated decisions, filters, batch checks; fail closed -> Output gate: citation/support validation, abstention, streaming authorization checks
- Context gate: verify active published versions, permissions, freshness, tombstones -> Output gate: citation/support validation, abstention, streaming authorization checks
- Output gate: citation/support validation, abstention, streaming authorization checks -> Employee browser: questions, streamed answers, citations, history
- Output gate: citation/support validation, abstention, streaming authorization checks -> Encrypted history: answers and complete source dependencies
- API gateway: identity validation, rate limits, deadlines -> History and citation gateway: reauthorize reads; withhold answers with denied dependencies
- Encrypted history: answers and complete source dependencies -> History and citation gateway: reauthorize reads; withhold answers with denied dependencies
- Authorization service: employee-isolated decisions, filters, batch checks; fail closed -> History and citation gateway: reauthorize reads; withhold answers with denied dependencies
- Encrypted S3: versioned extracted content and passage coordinates -> History and citation gateway: reauthorize reads; withhold answers with denied dependencies
- History and citation gateway: reauthorize reads; withhold answers with denied dependencies -> Employee browser: questions, streamed answers, citations, history
- Connectors: content reconciliation and permission synchronization -> Operations: latency, freshness, quality, revocation probes, alerts; redacted telemetry
- Authorization workers: ACLs, groups, deletions, complete source checkpoints -> Operations: latency, freshness, quality, revocation probes, alerts; redacted telemetry
- Query orchestrator: query embedding, retrieval, bounded context assembly -> Operations: latency, freshness, quality, revocation probes, alerts; redacted telemetry
- Output gate: citation/support validation, abstention, streaming authorization checks -> Operations: latency, freshness, quality, revocation probes, alerts; redacted telemetry
- Content workers: exclusions, extraction, permission-boundary chunking, idempotent staging -> PostgreSQL: authorization graph, tombstones, freshness leases; publication registry with ⋅
- PostgreSQL: authorization graph, tombstones, freshness leases; publication registry with ⋅ -> Context gate: verify active published versions, permissions, freshness, tombstones
