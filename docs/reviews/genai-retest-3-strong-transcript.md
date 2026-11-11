# Full passing Senior RAG transcript

This is the complete successful adaptive strong-candidate run before the final cross-ID history-budget guard. The subsequent guarded full validation was interrupted by provider credits; this transcript is not presented as post-guard acceptance. All provider calls were real; only the interview clock was simulated. The isolated server session ended at 45:00. The candidate saw only the public brief, the actual conversation and its own drawing.

Overall signal: **strong_yes**. Grading took **27.53 seconds**. App cost was **$1.032265**, including the scorecard. Simulator and audit costs are reported separately in the main report.

The complete-coverage independent audit found zero repeated interviewer sentences, zero issues asked more than twice and zero canned fallbacks. UI controls are labeled below. Quiet turns contain no interviewer text.

## Opening

```text
What would you clarify before starting your design?
```

## Minute 0.5, stage 1

Candidate:

```text
1. What is the expected workload: number of employees, peak questions per second, document volume, and acceptable answer latency? How fresh must answers be after a source changes, and is there a per-query or monthly cost ceiling?

2. What access rules must we preserve across the source systems, including private chat threads and document-level restrictions? How quickly must permission revocations take effect, and are there retention or residency restrictions for indexed content, prompts, and answer logs?
```

Interviewer:

```text
20,000 employees.

5M documents from five sources: wiki, drive, tickets, chat and docs.

First token under two seconds at p95, and a full answer under eight seconds.

About 2% of documents change daily; edits must appear within 15 minutes.

The cost target is about two cents per question.

Removed access must apply within five minutes.

There are no data residency requirements.

That detail isn't specified. What would you assume?
```

## Minute 1.5, stage 1

Candidate:

```text
For retention, I’d assume we may persist an encrypted search index, but not raw prompts or generated answers by default. Operational logs would contain only IDs, timings, and error codes, retained for 30 days. Deleted source content must become unservable within five minutes, matching access revocations, with physical removal from the index within 24 hours. These are working assumptions pending policy approval.

One additional permissions question: can access vary within a source item, such as individual messages in a chat thread or restricted attachments on an otherwise visible ticket? I’ll assume we must also hide the titles, snippets, and existence of anything the employee cannot access.
```

Interviewer:

```text
To confirm, that detail isn't specified. Which working assumption would you use?
```

## Minute 2.5, stage 1

Candidate:

```text
I’d assume permissions can vary within an item: individual chat messages and ticket attachments may have narrower access than their parent. Access to a thread or ticket does not imply access to every child. Unauthorized content must not influence answers or appear in citations, titles, snippets, or result counts. If we cannot establish access, we deny access rather than inherit a broader permission.

One remaining requirement question: when authorized sources are insufficient or contradictory, is an explicit abstention or a cited explanation of the disagreement acceptable? My working assumption is yes: the assistant should not fill gaps with unsupported company-specific claims.

For the unanswered peak-load figure, I’ll provisionally assume 50 questions per second, subject to validation. With those assumptions and the retention policy already stated, I’m ready to draw the architecture.
```

Interviewer:

```text
There is no specification for that detail. Which assumption would you make?
```

## Minute 3.5, stage 2

Candidate:

```text
I’d assume explicit abstention is acceptable when authorized evidence is insufficient. When authorized sources conflict, the assistant should cite both, explain the disagreement, and avoid presenting either as settled policy without evidence of precedence. It must never use inaccessible sources to resolve that conflict.

I’ll retain the provisional peak of 50 questions per second and the retention and fine-grained permission assumptions already stated. With the supplied latency, freshness, revocation, and cost targets, I have enough requirements to draw the architecture.
```

Interviewer:

```text
Those are reasonable working assumptions.

Let's move to the whiteboard. Sketch your design, then choose Ready to explain when you're ready.
```

## Minute 4.5, stage 2

Candidate:

```text
I have enough requirements to proceed. I’ll use 50 questions per second as the provisional peak, enforce permissions at the message and attachment level, and fail closed when access cannot be established. Answers will abstain when authorized evidence is insufficient and cite disagreements when sources conflict. I’ll retain the retention assumptions we discussed. Ready to draw and explain the architecture.
```

Interviewer:

Quiet listening, no text delivered.

## Minute 5.5, stage 2

Candidate:

```text
One remaining corpus question: what are the typical and upper-end document sizes, and do PDFs include scanned pages that require OCR? Five million short tickets is a very different ingestion workload from five million long PDFs.

If those figures aren’t available, I’ll assume 10 KB of extracted text per document on average, roughly 50 GB before indexing overhead, with a minority of scanned PDFs requiring OCR. Large documents will need asynchronous processing within the same 15-minute freshness target. Otherwise, I have enough requirements to draw the architecture.
```

Interviewer:

```text
You'll need to choose a working assumption for that unspecified detail. What will you use?
```

## Minute 6.5, stage 2

Candidate:

```text
I’ll assume an average of 10 KB of extracted text per document, approximately 50 GB across 5 million documents, with a p99 of 1 MB. I’ll assume 5% of documents require OCR and occasionally encounter PDFs up to 100 MB. These are sizing assumptions to validate against a source inventory, not limits on supported content.

The 15-minute freshness target will include extraction and OCR. If processing fails or exceeds that window, we’ll mark the item unavailable rather than silently serve a superseded version. Access revocations and deletions must still make it unservable within five minutes, independently of extraction.

With the workload, latency, cost, retention, and fine-grained permission assumptions already established, I’m ready to draw the architecture.
```

Interviewer:

Quiet listening, no text delivered.

## Minute 7.5, stage 2

Candidate:

```text
Working assumptions: 50 questions/second peak, 10 KB extracted text/document average, 1 MB p99, and 5% requiring OCR. Permissions apply independently to messages and attachments. Insufficient authorized evidence produces abstention.

Capacity estimates, using decimal units:

- Corpus: 5M × 10 KB = 50 GB extracted text. Assuming four bytes/token gives approximately 12.5B tokens.
- Index: 500-token chunks with 100-token overlap yield roughly six chunks/document, or 30M chunks. At 768 dimensions × 2 bytes, embeddings occupy 46 GB before index overhead. Budget approximately 300 GB per searchable copy for text, vectors, metadata, and indexes, then validate experimentally. Two copies require approximately 600 GB.
- Updates: 5M × 2% = 100,000 documents/day, averaging 1.16 documents/second. Provision initially for 10× bursts, approximately 12 documents/second. Assuming representative changes, OCR receives 5,000 documents/day; page counts must determine worker sizing.
- Serving: 50 questions/second × 8 seconds implies approximately 400 in-flight requests. At an assumed 500 output tokens/answer, generation demand reaches 25,000 tokens/second.
- Cost: 50 × $0.02 = $1/second, or $86,400/day if peak were sustained, not a traffic forecast. Reserve $0.015/question for inference and $0.005 for infrastructure.

Revocations and deletions bypass extraction queues. Authorization uncertainty fails closed; failed ingestion retries idempotently without making stale content newly servable.
```

Interviewer:

Quiet listening, no text delivered.

## Minute 8, stage 2

Candidate control:

```text
Start drawing
```

Interviewer:

Quiet listening, no text delivered.

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
The main path is browser → gateway → retrieval → authorized context → generation → delivery gate.

**1. Establish identity.** The gateway validates the employee’s OIDC token and resolves current group memberships through the authorization service. Request-local state includes employee ID, authorization epoch, deadline, and trace ID, not a persisted prompt. Authorization caches expire within 60 seconds; expired state cannot be used if refresh fails.

**2. Retrieve evidence.** The orchestrator embeds the question and runs OpenSearch BM25 and vector searches in parallel. I choose hybrid retrieval because exact ticket IDs and semantic questions need different matching behavior. Each chunk stores text, embedding, source ID, child-item ID, version, ACL reference, and citation coordinates. PostgreSQL holds authoritative active versions, ACL mappings, and tombstones.

Search applies permission filters, merges approximately 100 candidates, then authoritatively checks their access and versions before any text reaches the reranker or model. Native source checks handle permissions we cannot reproduce reliably. Unknown access means exclusion, never broader inheritance.

**3. Build context.** Rerank authorized candidates and select roughly eight chunks within a 6,000-token budget. Adjacent chunks are included only after their own authorization checks. Every passage carries an opaque citation ID mapped to its source version and location. Retrieved instructions are untrusted data; the model has no source-browsing tools or authority to change permissions.

**4. Generate and validate.** A private, zero-retention model endpoint produces a bounded answer with passage citations. Missing evidence produces abstention; conflicting evidence produces a cited disagreement. The delivery gate checks citation membership and claim support. Support checking reduces hallucinations but is not a proof of correctness.

**5. Deliver safely.** Before releasing each buffered sentence, recheck evidence permissions and versions. If access changes, stop and regenerate from remaining evidence or abstain. Citation clicks reauthorize independently.

I budget 150 ms for identity, 450 ms for retrieval, 250 ms for reranking, and 900 ms for generation to the first validated sentence: approximately 1.75 seconds. These are targets to benchmark, leaving generation the remainder of the eight-second deadline. Prompts and answers are not retained.
```

Interviewer:

Quiet listening, no text delivered.

## Minute 11, stage 2

Candidate:

```text
To complete the drawing, the ingestion path has two independent lanes: content processing through Kafka, extraction and embeddings; and priority revocations/deletions directly into the control store and search index.

**Data boundaries:** Messages and attachments become separately authorized units. Chunks never cross permission boundaries. Raw files exist only in encrypted, short-lived extraction storage; indexed text persists encrypted. Only authorized passages leave retrieval for reranking or the zero-retention model endpoint. Operational logs contain IDs, timings and error codes, not questions, passages or answers.

**Correctness rules:** Every ingestion event carries a source version. Workers write a complete new chunk generation before atomically activating it in PostgreSQL. Retrieval rejects chunks whose generation is not active. Duplicate events are idempotent; older events cannot overwrite newer versions or resurrect tombstones. Failed extraction retries through the dead-letter workflow; overdue changed items become unavailable rather than silently remaining current.

Revocations invalidate authorization state independently of OCR. I would alert at two minutes of security-update lag and make affected sources unavailable before five minutes if freshness cannot be established. Reconciliation polling repairs missed events.

**Tradeoff:** OpenSearch permissions are an optimization, not the security authority. Authoritative checks before model access and delivery add latency and can reduce availability during authorization outages. I accept that cost because stale index ACLs must never become permission grants. We batch checks to contain latency, but fail closed rather than serve from expired authorization state.
```

Interviewer:

```text
Got it. I’m following the ingestion and security paths.
```

## Minute 12, stage 3

Candidate control:

```text
Done explaining
```

Interviewer:

```text
You mentioned a reranker, but I don't see it labeled in the current drawing. Where does it sit on the request path?
```

## Minute 13, stage 3

Candidate:

```text
It sits between hybrid retrieval’s authoritative access checks and context construction, before answer generation. The intended node is labeled “Reranking and context builder,” but I should have made that boundary clearer.

The request path is: hybrid search → merge approximately 100 candidates → authoritative permission and active-version checks → rerank authorized candidates → build the roughly eight-chunk context → generate.

I’d use a small cross-encoder reranker that scores each question-passage pair for relevance. It receives only authorized text and cannot grant access or fetch additional documents. The context builder then applies the token budget and attaches citation provenance.

The combined reranking/context stage has a 250 ms target. If reranking times out, we fall back to reciprocal-rank fusion of the authorized BM25 and vector results. That reduces relevance quality, not permission enforcement; authorization checks remain mandatory.
```

Interviewer:

```text
How would you choose the chunk size and overlap for the different document types in your ingestion path?
```

## Minute 14.5, stage 3

Candidate:

```text
My earlier 500-token chunks with 100-token overlap were a sizing baseline, not a universal rule. I’d use structure-aware splitting, with these starting settings:

- **Wiki and docs:** target 500 tokens, 80-token overlap, split at headings and paragraph boundaries. Include the heading hierarchy within the token budget.
- **PDFs:** target 600 tokens, 100-token overlap, respecting sections and table boundaries. Preserve page coordinates for citations. Repeat table headers when splitting large tables; flag unreliable OCR rather than presenting corrupted text as evidence.
- **Tickets:** keep the issue description and individual comments identifiable; target 400 tokens with 50-token overlap for long comments. Preserve timestamps and status changes so historical discussion isn’t mistaken for the current resolution.
- **Chat:** group consecutive messages within one thread into roughly 300-token windows, overlapping one message, capped at 60 tokens. Retain speaker and timestamp attribution.

Chunks never cross permission boundaries. Attachments are independent documents; neighboring messages enter context only after their own authorization checks.

I’d tune these on approximately 500 labeled questions spanning sources, exact lookups, multi-passage answers, and permission boundaries. Compare 300/500/800-token variants using authorized evidence recall@20, citation accuracy, grounded answer quality, p95 latency, and index cost. Larger chunks preserve context but dilute retrieval and consume the 6,000-token context budget; overlap improves boundary recall but duplicates storage and evidence. I’d deduplicate overlapping passages before generation.
```

Interviewer:

```text
What happens if PostgreSQL activates a new chunk generation before all of its chunks are searchable in OpenSearch?
```

## Minute 16, stage 3

Candidate:

```text
That creates a retrieval hole: PostgreSQL marks the new generation active, but OpenSearch returns only some new chunks. Old chunks are rejected by the active-version check, so answers can become incomplete or incorrectly abstain. Authorization remains enforced, but freshness and availability suffer. My earlier activation rule was underspecified.

I’d use a publish protocol:

1. Create a **pending generation** in PostgreSQL with its expected chunk count and a manifest of chunk IDs and hashes.
2. Bulk-index using deterministic IDs. Check every item’s result and retry partial failures idempotently.
3. Wait for refresh, then verify the complete manifest through the search-serving path. A successful bulk acknowledgment alone is insufficient. Only verified shard copies may serve that generation.
4. Compare-and-swap the active generation in PostgreSQL, conditional on the source version still being current and no tombstone superseding it.

Until activation, the previous generation remains active, but only within the existing 15-minute freshness window. Beyond that, the item becomes unavailable.

If premature activation nevertheless occurs, quarantine the document and repair or finish publishing the generation. I would not automatically roll back to potentially obsolete content.

There is no cross-system atomic transaction here. Visibility gating prevents the normal race; version checks and fail-closed handling contain failures, at the cost of temporary unavailability.
```

Interviewer:

```text
How does your delivery gate check whether a generated claim is supported by its cited passages, and what happens when that check fails?
```

## Minute 17.5, stage 3

Candidate:

```text
The gate checks support against the cited passage text, not merely whether the citation exists.

1. **Validate provenance:** Resolve each citation ID against the request’s authorized context. Reject unknown IDs, mismatched versions, or fabricated quotations. Source text is evidence, never verifier instructions.
2. **Extract atomic claims:** Split each buffered sentence into independently checkable assertions. “Leave is 20 days and contractors qualify” requires support for both assertions. Every company-specific factual claim needs evidence.
3. **Check entailment:** Run a small verifier on each claim and its cited passages, classifying supported, contradicted, or insufficient. Add deterministic checks for quoted text, numbers, dates, and units. Related subject matter alone is insufficient; qualifiers and exceptions must match.

As an initial threshold, I’d require a calibrated support score of at least 0.95, tuned on human-labeled policy, numerical, and multi-passage examples. The score is not a correctness guarantee. I’d measure false acceptance separately from unnecessary abstention.

On failure, hold the sentence and attempt one constrained rewrite using only supported evidence, then verify again. If it still fails, the verifier times out, or the eight-second deadline is near, omit the unsupported assertion and explicitly state the evidence limitation. Never release the original sentence.

Checks run per buffered sentence. Their measured latency must fit the first-token budget; otherwise I’d revise my earlier 1.75-second estimate rather than bypass validation.
```

Interviewer:

```text
What happens if an extraction worker completes an update but loses its Kafka acknowledgement, and that event is redelivered after a newer source version has already been published?
```

## Minute 19, stage 3

Candidate:

```text
The redelivery must become a no-op, not republish the older generation. Kafka provides at-least-once delivery; correctness comes from idempotent writes and conditional publication.

Assume the event identifies document D and source version v10, while v11 is now active:

1. **Check durable state:** The worker reads D’s current desired version, active generation, and tombstone. Because v10 is superseded, it acknowledges the event without extracting or publishing again.
2. **Fence races:** That initial check is only an optimization. Every attempt writes into an immutable generation namespace, using deterministic chunk IDs. Activation is a PostgreSQL compare-and-swap requiring the desired source version and worker fencing token to match, with no superseding tombstone. Thus, a v10 worker already running when v11 publishes also cannot activate its output.
3. **Recover duplicates:** If v10 were still current and already published, the durable completion record would let the retry acknowledge immediately. If only partially indexed, it would resume idempotently and repeat visibility verification before activation.

A stale worker may leave orphaned chunks, but cannot overwrite v11’s chunks. Retrieval rejects inactive generations; garbage collection removes abandoned ones.

I would not numerically compare arbitrary source ETags. Where sources lack ordered revisions, the connector serializes per-document reconciliation and assigns fenced internal generations after fetching current state. Kafka acknowledgements happen only after a durable terminal outcome.
```

Interviewer:

```text
If a permission change occurs after some sentences have already been delivered, how does your design handle those sentences when regenerating the rest of the answer?
```

## Minute 20.5, stage 4

Candidate:

```text
Already delivered text cannot reliably be revoked. A browser can hide it, but the employee may have copied or captured it. My guarantee is authorization at release, within the five-minute revocation bound, not retroactive erasure.

When a permission change is detected mid-answer:

1. **Stop delivery and cancel generation.** Discard all undelivered buffered text, including sentences citing still-accessible passages: their wording may have been influenced by revoked evidence.
2. **Invalidate the response context.** Reauthorize every passage against current permissions. Start a fresh model request containing only currently authorized evidence, without the previous generated answer or revoked passages. Continuing the existing model conversation would retain restricted information.
3. **Replace rather than append.** Mark the previous response as withdrawn and clear it from the normal UI, including citation previews. Display a generic notice: “Access changed while this answer was being generated.” Generate a standalone replacement, or abstain if evidence or time is insufficient. This UI cleanup is best effort, not a security boundary.

For subsequent turns, previously generated assistant text is not trusted evidence. Rebuild company-specific context from reauthorized sources; do not silently reuse the withdrawn answer.

If revocation happened before release but our authorization cache had not observed it, exposure is bounded by the agreed five-minute propagation window. Requiring instantaneous revocation would need a stronger source-side authorization contract than this design currently assumes.
```

Interviewer:

```text
What happens to an employee's request if the private model endpoint rate-limits generation?
```

## Minute 22, stage 4

Candidate:

```text
On a generation HTTP 429, I keep the request within its original eight-second deadline rather than retry indefinitely.

- **Bound admission:** Use a token-aware limiter and bounded queue before calling the endpoint. At our assumed peak, 50 requests/second × 500 output tokens requires 25,000 output tokens/second, plus input-token capacity. I’d reserve quota with headroom and enforce per-user fairness.
- **Retry selectively:** Honor `Retry-After`, adding jitter. Allow at most one retry, and only if the remaining deadline covers generation and validation. Before streaming starts, queueing is capped at 200 ms to protect the two-second first-token target. A longer provider backoff triggers fallback immediately.
- **Degrade safely:** Return authorized search results with source snippets and citations, clearly labeled “Answer generation is temporarily unavailable.” This is not a generated answer. Snippets still pass current permission and version checks. If retrieval also fails, return a retryable error, not an unsupported answer.

If streaming has already begun and fails, stop, mark the answer incomplete, and offer those source results. I would not silently splice in another generation.

Sustained 429s open a circuit breaker, with limited probes for recovery. I’d monitor throttling rate, queue time, and fallback frequency. I would not switch to an unapproved public endpoint: preserving confidentiality and the cost ceiling takes priority over answer availability.
```

Interviewer:

```text
How would you change the embedding model while keeping queries working against the existing OpenSearch index?
```

## Minute 23.5, stage 4

Candidate:

```text
I’d use a versioned blue-green index migration. Embeddings from different models are not comparable, even when their dimensions match.

1. **Keep production unchanged.** Queries continue using model A and index A. Create index B with model B’s dimensions, similarity metric, and explicit embedding-version metadata. Keep chunking unchanged initially to isolate the embedding change.
2. **Backfill and catch up.** Embed active chunk generations into B, prioritizing frequently used documents. Send ongoing content updates to both pipelines. Revocations and deletions still bypass embedding queues and apply to both indexes; authoritative permission checks remain mandatory.
3. **Verify readiness.** Reconcile B against the current active-generation manifest, not just the original snapshot. Measure coverage, update lag, authorized recall@20, answer quality, latency, and cost. Initially require at least 99.9% active-chunk coverage and no material recall regression on the labeled evaluation set.
4. **Canary, then switch.** Route 1%, 10%, then 100% of requests to B. Each request pins one configuration containing its query embedding model and index. Never send model B query vectors to index A. BM25 remains available throughout.
5. **Rollback safely.** Retain A and dual-write during a seven-day observation window. Rollback changes routing, not permissions or active-version checks.

The tradeoff is temporary duplicate index storage and embedding spend. I’d throttle backfill below live-update capacity so migration cannot jeopardize freshness.
```

Interviewer:

```text
What does the employee see if your vector store becomes unavailable?
```

## Minute 25, stage 4

Candidate:

```text
It depends on whether only vector search fails or the whole OpenSearch cluster fails. My design puts BM25 and vectors in the same cluster, so BM25 is not an independent disaster fallback.

**If vector search alone fails:** Cancel that branch within the 450 ms retrieval budget and use authorized BM25 results. Reranking, permission checks, generation, and citation validation remain unchanged. The employee can still receive a cited answer, but semantic matching may be weaker. If the evidence is insufficient, they see an explicit abstention, not a speculative answer.

**If OpenSearch is unavailable entirely:** After a short bounded attempt against a healthy replica, the employee sees: “Document search is temporarily unavailable. I can’t produce a supported answer. Please try again shortly.” No model-only answer, stale answer cache, or unchecked source snippets. PostgreSQL holds control metadata, not an alternative searchable corpus.

A circuit breaker prevents repeated slow searches from consuming the full eight-second deadline. I’d alert on search failures and probe recovery with known queries, then restore traffic gradually after checking active-version visibility and security-update lag. Sources whose authorization freshness cannot be established remain unavailable.

This sacrifices availability to preserve confidentiality and grounding. If independent search availability is required, I’d add a separately operated lexical index, accepting extra storage, synchronization complexity, and cost.
```

Interviewer:

```text
What happens to requests and incoming source updates if PostgreSQL becomes unavailable?
```

## Minute 26.5, stage 4

Candidate:

```text
PostgreSQL is a security-critical dependency, so I would not treat OpenSearch’s cached metadata as authoritative during an outage.

**Employee requests:** Stop admitting new retrieval requests and open a circuit breaker. In-flight requests stop releasing sentences once their control-state checks cannot complete. Discard undelivered output and show: “Document access checks are temporarily unavailable. Please retry shortly.” Already delivered text cannot be recalled. Citation resolution also fails closed wherever it depends on this store. I would not fall back to stale ACLs or active-generation metadata.

**Incoming updates:** Connectors continue putting events into durable Kafka queues. Workers pause publication and do not acknowledge events that require an uncommitted PostgreSQL change. Extraction already running may finish into an immutable staging generation, but cannot activate it. Security events remain prioritized; indexed ACL updates alone cannot restore serving because the authoritative control state is unavailable.

I’d provision seven days of Kafka retention, monitor backlog age and disk utilization, and pause connectors before exhausting capacity. Reconciliation repairs any source-event gaps.

**Recovery:** Use multi-AZ PostgreSQL with synchronous replication and fenced failover. After recovery, process security events first, reconcile source watermarks, then resume serving each source only when its permission freshness is established. Documents beyond the 15-minute edit window remain unavailable until refreshed.

This intentionally trades availability for confidentiality. Database recovery alone is insufficient; control-state freshness must recover too.
```

Interviewer:

```text
How would a sustained spike in OCR-heavy documents affect the capacity and cost needed to meet your 15-minute freshness target?
```

## Minute 28, stage 4

Candidate:

```text
OCR must be sized in **pages per second**, not documents per second. My earlier 12-document/second burst provision did not establish OCR capacity.

Assume 20 scanned pages/document and measured throughput of 30 pages/minute per worker:

- Baseline: 5,000 OCR documents/day × 20 pages = 100,000 pages/day, averaging 1.16 pages/second.
- Stress case: 12 documents/second, all scanned, means 240 pages/second.
- At 70% worker utilization, capacity needed is 240 ÷ (0.5 × 0.7) ≈ **686 workers**, versus approximately four for the baseline average.

Those are illustrative assumptions; I’d benchmark representative PDFs, including difficult scans and large files.

I’d allocate three minutes to discovery, ten to extraction/OCR, and two to embedding and publication. Autoscaling uses queued **estimated page-work and oldest-event age**, with warm capacity and sufficient provider quota. Page-parallel processing and per-document scheduling prevent giant PDFs from blocking small updates.

At an illustrative managed-OCR price of $1.50/1,000 pages, that sustained stress case costs approximately **$31,100/day for OCR alone**. The two-cent/question budget therefore needs ingestion costs amortized over actual question volume.

If quota or budget prevents sufficient scaling, the freshness target cannot be guaranteed. Alert before breach, prioritize changed content over backfills, and make overdue versions unavailable. Revocations remain independent of OCR.
```

Interviewer:

```text
How would you ensure deleted content is physically removed within 24 hours from index copies and backups, including after a restore?
```

## Minute 29.5, stage 4

Candidate:

```text
My earlier 24-hour promise was incomplete: deleting live chunks does not remove them from snapshots. I’d revise the storage policy rather than claim tombstones provide physical erasure.

**Live copies:** A deletion creates a durable tombstone and blocks serving within five minutes. A deletion worker inventories every generation across both migration indexes, replicas, extraction storage, and caches. It deletes those objects and verifies completion. OpenSearch deletes initially leave bytes in segments, so meeting physical removal requires segment reclamation or rebuilding affected index partitions, not merely a successful delete API response.

**Backups:** I would not snapshot extracted text or vector indexes. They are rebuildable from authorized sources. PostgreSQL backups contain control metadata, not document bodies. Kafka events carry IDs and versions, not source content; temporary extraction objects have bounded lifetimes and no versioned backups.

For existing content-bearing backups, we must delete every affected snapshot and underlying retained copy within the deadline. If the storage provider cannot guarantee that, I cannot honestly promise physical removal within 24 hours. Cryptographic erasure is an alternative only if policy explicitly accepts it, not equivalent physical deletion.

**Restore:** Keep the deletion ledger independently durable. Before serving, replay deletions, reconcile current source permissions and existence, and rebuild indexes. Never restore directly into service.

I’d alert on incomplete deletion at 12 hours and escalate before 24. This costs rebuild time and storage flexibility but makes the retention promise enforceable.
```

Interviewer:

```text
How would you prevent operational logs containing source IDs from revealing the existence of restricted documents to someone who can access those logs?
```

## Minute 30, stage 4

Candidate control:

```text
Pause to draw
```

Interviewer:

```text
Take your time with the whiteboard. I'll hold questions while you draw. Choose Ready to explain when you're ready.
```

## Minute 31, stage 4

Candidate control:

```text
Ready to explain
```

Interviewer:

Quiet listening, no text delivered.

## Minute 32, stage 4

Candidate:

```text
I added a **telemetry privacy filter** before observability and rerouted the logging edges through it. The filter allowlists timings, coarse error codes, and random request trace IDs. It drops source IDs, chunk IDs, URLs, titles, ACL references, and content. Unknown fields are dropped by default.

Observability now retains only sanitized events for 30 days, with aggregate metrics that have no document-level dimensions. I would not replace document IDs with stable hashes: those still allow correlation and can reveal a restricted document’s existence.

This explicitly revises my earlier assumption that operational logs could contain source IDs. Access to operational logs must not implicitly grant access to the document catalog.

The tradeoff is less document-specific debugging information. Random trace IDs still let operators correlate request-stage failures without identifying the underlying documents. I’d test the filter with seeded restricted identifiers and assert that none reach the logging sink.
```

Interviewer:

```text
Got it, you added a telemetry privacy filter and routed logging through it.
```

## Minute 33, stage 4

Candidate control:

```text
Done explaining
```

Interviewer:

```text
What happens to operational events if the telemetry privacy filter becomes unavailable?
```

## Minute 34, stage 4

Candidate:

```text
Telemetry fails closed for data export, not for employee requests. If the privacy filter is unavailable, producers must never bypass it and write raw events directly to observability.

I’d implement two safeguards:

- **Minimize at the producer:** Operational-event schemas already exclude document identifiers and content. The filter independently enforces that allowlist. Exception messages, stack traces, and arbitrary key-value fields are not automatically exported.
- **Bound buffering:** Keep only schema-valid events in an in-memory queue, capped initially at 10 MB per instance and 60 seconds of age. On overflow or expiry, drop events and increment a local aggregate dropped-event counter. No raw-event disk spool, dead-letter queue, or fallback console logging.

The question-answering path continues because telemetry is asynchronous. Authorization, version checks, and delivery validation remain mandatory and independent of logging availability.

An independent health probe alerts on filter unavailability using only a fixed service label and failure count, not the rejected payload. After recovery, drain unexpired events through the filter with rate limiting. Dropped events are not reconstructed from prompts or source data.

The tradeoff is a temporary observability gap rather than a confidentiality breach or a company-wide assistant outage. Security-critical state, such as tombstones and publication records, still commits to its authoritative store; those records are not optional operational telemetry.
```

Interviewer:

```text
How would your ingestion path detect an OCR error that changes a policy number but still produces plausible text?
```

## Minute 35.5, stage 4

Candidate:

```text
Plausible text can still be wrong, so language fluency and OCR confidence alone are insufficient. I’d validate policy numbers against the original page image before publishing them as evidence.

- **Preserve provenance:** Store OCR token bounding boxes and confidence, linked to source version and page. Flag numeric spans, including percentages, currency, dates, durations, and nearby qualifiers such as “maximum” or “not.”
- **Independently verify sensitive spans:** For scanned policy documents, run a second OCR engine on numeric regions with surrounding context. Compare normalized values while preserving decimal points, signs, and units. For example, “15 days” versus “75 days” blocks publication of that passage, even if both engines report high confidence.
- **Escalate uncertainty:** Disagreement, poor image quality, or a large numerical change from the previous version triggers review against the image by an authorized reviewer. A historical difference is a warning, not proof of error: policies legitimately change.

Both engines can make the same mistake. For high-impact HR, payroll, or safety policy numbers, I’d require source-owner verification of scanned values before treating them as authoritative. Until verified, quarantine the affected passage and abstain on that claim; do not silently substitute the previous value.

I’d measure numeric transcription error and false acceptance on labeled scans with digit substitutions and decimal-loss cases. This adds OCR cost and may miss freshness targets, but unsupported policy numbers should not become confident answers.
```

Interviewer:

```text
At your assumed peak of 50 questions per second, how would you size and assess the latency impact of authoritative access checks on roughly 100 candidates per request?
```

## Minute 37, stage 5

Candidate:

```text
At 50 questions/second × 100 candidates, we need **5,000 candidate authorization decisions/second**, not necessarily 5,000 network calls.

**Batch the checks.** Retrieval sends one batch containing employee identity, child-item IDs, ACL references, and generations. The authorization service deduplicates identical permission scopes without collapsing narrower message or attachment permissions. It batch-reads control metadata and evaluates ACLs using current group membership. That is approximately 50 batch RPCs/second, each evaluating up to 100 candidates.

I’d initially provision for **10,000 decisions/second**, providing 2× headroom, then benchmark. At an assumed 40 ms average batch latency, Little’s law gives 50 requests/second × 0.04 seconds = **two concurrent batches on average**. Tail latency and failover require substantially more concurrency capacity.

**Native-source checks are the risk.** I’d batch per source and run those batches concurrently with bounded connections. Without batching or valid cached decisions, the worst case becomes 5,000 external RPCs/second, which may exceed source quotas. Unsupported candidates are excluded, never implicitly authorized.

Within the existing 450 ms retrieval budget, I’d target 100 ms p95 for authorization, leaving 350 ms for search and merging. These targets need end-to-end validation, not addition of independent percentiles.

Load tests include cold caches, unique ACLs, slow sources, and revocations. Deadline-expired checks fail closed. Delivery rechecks add separate load; request-local deduplication must not bypass authorization freshness.
```

Interviewer:

```text
How would you test whether malicious instructions embedded in retrieved passages can influence generated answers despite treating those passages as untrusted data?
```

## Minute 38.5, stage 5

Candidate:

```text
I’d test this as an adversarial end-to-end evaluation, not just check whether the model follows a system prompt.

**Build paired cases:** Start with roughly 500 representative questions and authorized evidence. Create poisoned variants that preserve the factual answer but insert instructions into wiki text, PDF OCR, ticket comments, and chat messages. Include fake system messages, “ignore previous instructions,” fabricated policy overrides, citation manipulation, encoded payloads, and instructions to leak context into an external URL.

**Exercise actual retrieval:** Test both forced-context injection and normal ingestion through retrieval. The first isolates model susceptibility; the second measures whether keyword stuffing or repeated malicious passages dominate ranking. Include attacks spread across multiple chunks.

**Assert observable outcomes:** Compare clean and poisoned answers for factual changes, attacker-requested phrases, unsupported claims, fabricated citations, and abstention. Use deterministic checks plus blinded human review, not only another model’s judgment. Seed synthetic canaries to detect disclosure of unrelated context. Separately assert that unauthorized passages never reach either generator or verifier.

Run the same attacks against the claim-support verifier: a compromised verifier could approve the poisoned answer.

Any unauthorized disclosure blocks release. Initially, I’d also block on any successful high-severity instruction-following attack in this suite. Zero observed successes is not proof of safety.

Failures become regression tests. I’d strengthen context isolation or narrow answer behavior, then rerun quality and latency tests rather than rely on prompt wording alone.
```

Interviewer:

```text
Let's stay on your design.
```

## Minute 40, stage 5

Candidate:

```text
Concretely, in this design, injection defenses sit at three existing boundaries:

- **Retrieval to context builder:** Only authorized, active-version passages enter context. The builder labels them as source data with server-assigned citation IDs. Passage text cannot create citation mappings or change permissions.
- **Context to generator:** The model has no browsing, network, or action tools. A passage requesting an external upload cannot cause one. However, malicious text could still distort the answer, so tool isolation alone is insufficient.
- **Generator to delivery gate:** The gate accepts only citations from the authorized context and verifies claims against those passages. Its verifier receives source text as untrusted evidence too. Failed checks trigger the bounded rewrite or abstention already described.

I’d test poisoned documents through this exact ingestion-to-delivery path and check what the employee actually receives. If an attack defeats both generation and verification, that exposes a real limitation: the verifier is not an independent security boundary. Authorization remains enforced outside both models; semantic manipulation requires regression testing and potentially narrower answer behavior.
```

Interviewer:

```text
How would you decide whether the cost of checking every buffered sentence is justified by its safety benefit?
```

## Minute 41.5, stage 5

Candidate:

```text
I’d separate mandatory security checks from the probabilistic claim-support check. Authorization, active-version checks, and citation provenance remain mandatory regardless of verifier economics.

For semantic verification, I’d compare two configurations on identical answers: deterministic citation/number checks alone versus those checks plus per-sentence entailment verification. Use human-labeled policy, numerical, conflicting-source, and ordinary lookup questions, including poisoned passages.

Measure:
- Unsupported claims actually prevented from reaching employees, weighted by severity.
- False acceptance and unnecessary abstention.
- Added p95 first-sentence and full-answer latency.
- Cost per question, including verifier retries and rewrites.

For example, assuming six sentences per answer, a verifier averaging $0.0002 per sentence costs **$0.0012/question**, or 6% of the two-cent budget. At 50 questions/second, that is **300 sentence checks/second**. Those are planning assumptions to benchmark, not vendor guarantees. Repeated context processing could make actual cost substantially higher.

I’d retain it if it materially reduces serious unsupported claims while keeping total cost below $0.02 and latency within the two/eight-second targets. For high-impact policy answers, even a small reduction can justify the expense; aggregate error counts alone obscure that value.

If benefits are marginal, I’d explicitly revise the design toward batched atomic-claim verification or narrower extractive answers. I would not silently bypass verification on timeout. The verifier reduces semantic risk; it never establishes permission safety.
```

Interviewer:

```text
If the embedding migration’s duplicate storage and backfill spend push total cost above the per-question target, how would you decide whether to proceed with the migration?
```

## Minute 43, stage 5

Candidate:

```text
I would pause the rollout rather than assume a better embedding model justifies exceeding the budget. Model A remains serving while we assess three things:

1. **Budget accounting:** Is $0.02 a hard all-in ceiling during migration, or a steady-state target allowing an approved one-time investment? Until clarified, I treat it as a hard ceiling. Use actual question volume, not the assumed peak, to amortize costs.
2. **Measured benefit:** Compare B against A on authorized evidence recall, grounded answer quality, abstention, latency, and important question categories. Better embedding benchmarks alone do not justify migration.
3. **Migration economics:** Include backfill, duplicate storage, dual writes, evaluation, and the seven-day rollback window.

For example, at an assumed **1 million questions/month**, a current all-in cost of **$0.018/question** leaves **$2,000/month** below the target. A **$6,000 migration** adds **$0.006/question** if charged that month, pushing cost to **$0.024/question**. That requires explicit approval or a cheaper schedule.

I’d first reduce dimensions if evaluation supports it, throttle backfill into spare capacity, and migrate bounded source partitions while retaining matched model/index routing. Slower migration reduces burst spend but can increase duplicate-storage costs, so it is not automatically cheaper.

If B fixes a serious retrieval gap, I’d present the measured benefit and request a bounded exception. If improvements are marginal, I’d defer. Authorization, freshness capacity, and rollback safety are not budget-cutting options.
```

Interviewer:

```text
Conclude the interview when ready, noting the tradeoff between a slower migration and duplicate-storage costs.

Walk me through fresh:7179b8dadc8f7599 in your design, starting with the first decision.
```

## Minute 44.5, stage 5

Candidate:

```text
`fresh:7179b8dadc8f7599` hasn’t been defined in our discussion. If it identifies a particular failure scenario, please provide that scenario. Assuming it labels a fresh employee request, I’d trace it this way:

1. **First decision: can we establish identity and current access?** Validate OIDC identity and resolve group membership. If authoritative authorization or control state is unavailable, fail closed.
2. **Retrieve evidence:** Embed the question using the model pinned to the selected index. Run BM25 and vector retrieval, then merge approximately 100 candidates.
3. **Authorize before model exposure:** Batch-check each candidate’s permissions, active generation, and deletion state. Exclude uncertain or superseded candidates.
4. **Build context:** Rerank authorized passages and select roughly eight within the 6,000-token budget, attaching server-controlled citation mappings.
5. **Generate and release:** Produce a grounded answer, verify each buffered sentence’s claims and citations, and recheck evidence access before release. Unsupported claims are rewritten once or withheld. Insufficient evidence produces abstention.

My concluding tradeoff is security and grounding over availability. For embedding migration, slowing backfill lowers immediate compute spend but prolongs duplicate storage and dual writes. I’d compare total migration cost across schedules, preserve live-update capacity and rollback safety, and defer migration if its measured benefit cannot justify the budget impact.
```

Interviewer:

```text
End the interview when ready, noting your decision to accept reduced availability for authoritative access checks.
```

## Final diagram

Nodes:

- Employee browser: authenticated questions and cited answers
- API gateway and query orchestrator: OIDC identity, rate limits, deadlines, no persisted th
- Company identity provider: employee identity and group memberships
- Source systems: wiki, drive, tickets, chat, and docs with native permissions
- Source connectors: initial crawl, change events, and reconciliation polling
- Kafka ingestion queues: durable ID-and-version events, retries, and dead-letter queue
- Extraction workers: PDF parsing, OCR, message and attachment separation, permission-bounda
- Embedding workers: versioned 768-dimensional chunk embeddings
- PostgreSQL control store: desired and active generations, publication manifests, fine-gra
- Priority security updater: permission revocations and deletions, independent of extractio
- OpenSearch cluster: replicated BM25 and vector indexes, immutable chunk generations, vers
- Authorization service: identity-aware ACL evaluation, source checks where required, fail
- Hybrid retrieval service: ACL-filtered BM25 and vector search, merge, then authoritative 
- Reranking and context builder: authorized evidence only, token budget, citation provenance
- Private model endpoint: query embeddings and grounded answer generation, zero retention
- Answer validator and delivery gate: citation provenance, claim-support checks, permission
- Citation resolver: reauthorize source links on click without exposing restricted titles 
- Observability and evaluation: sanitized operational events retained 30 days; aggregate la
- Telemetry privacy filter: allowlisted timings, coarse error codes, random request trace I

Connections:

- Employee browser: authenticated questions and cited answers -> API gateway and query orchestrator: OIDC identity, rate limits, deadlines, no persisted th
- API gateway and query orchestrator: OIDC identity, rate limits, deadlines, no persisted th -> Company identity provider: employee identity and group memberships
- Source systems: wiki, drive, tickets, chat, and docs with native permissions -> Source connectors: initial crawl, change events, and reconciliation polling
- Source connectors: initial crawl, change events, and reconciliation polling -> Kafka ingestion queues: durable ID-and-version events, retries, and dead-letter queue
- Kafka ingestion queues: durable ID-and-version events, retries, and dead-letter queue -> Extraction workers: PDF parsing, OCR, message and attachment separation, permission-bounda
- Extraction workers: PDF parsing, OCR, message and attachment separation, permission-bounda -> Embedding workers: versioned 768-dimensional chunk embeddings
- Embedding workers: versioned 768-dimensional chunk embeddings -> OpenSearch cluster: replicated BM25 and vector indexes, immutable chunk generations, vers
- Extraction workers: PDF parsing, OCR, message and attachment separation, permission-bounda -> PostgreSQL control store: desired and active generations, publication manifests, fine-gra
- Source connectors: initial crawl, change events, and reconciliation polling -> Priority security updater: permission revocations and deletions, independent of extractio
- Priority security updater: permission revocations and deletions, independent of extractio -> PostgreSQL control store: desired and active generations, publication manifests, fine-gra
- Priority security updater: permission revocations and deletions, independent of extractio -> OpenSearch cluster: replicated BM25 and vector indexes, immutable chunk generations, vers
- PostgreSQL control store: desired and active generations, publication manifests, fine-gra -> Authorization service: identity-aware ACL evaluation, source checks where required, fail
- Authorization service: identity-aware ACL evaluation, source checks where required, fail -> Source systems: wiki, drive, tickets, chat, and docs with native permissions
- Authorization service: identity-aware ACL evaluation, source checks where required, fail -> Company identity provider: employee identity and group memberships
- API gateway and query orchestrator: OIDC identity, rate limits, deadlines, no persisted th -> Hybrid retrieval service: ACL-filtered BM25 and vector search, merge, then authoritative 
- Hybrid retrieval service: ACL-filtered BM25 and vector search, merge, then authoritative  -> Private model endpoint: query embeddings and grounded answer generation, zero retention
- Hybrid retrieval service: ACL-filtered BM25 and vector search, merge, then authoritative  -> Authorization service: identity-aware ACL evaluation, source checks where required, fail
- Hybrid retrieval service: ACL-filtered BM25 and vector search, merge, then authoritative  -> OpenSearch cluster: replicated BM25 and vector indexes, immutable chunk generations, vers
- Hybrid retrieval service: ACL-filtered BM25 and vector search, merge, then authoritative  -> Reranking and context builder: authorized evidence only, token budget, citation provenance
- Reranking and context builder: authorized evidence only, token budget, citation provenance -> Private model endpoint: query embeddings and grounded answer generation, zero retention
- Private model endpoint: query embeddings and grounded answer generation, zero retention -> Answer validator and delivery gate: citation provenance, claim-support checks, permission
- Reranking and context builder: authorized evidence only, token budget, citation provenance -> Answer validator and delivery gate: citation provenance, claim-support checks, permission
- Answer validator and delivery gate: citation provenance, claim-support checks, permission -> Authorization service: identity-aware ACL evaluation, source checks where required, fail
- Answer validator and delivery gate: citation provenance, claim-support checks, permission -> API gateway and query orchestrator: OIDC identity, rate limits, deadlines, no persisted th
- API gateway and query orchestrator: OIDC identity, rate limits, deadlines, no persisted th -> Employee browser: authenticated questions and cited answers
- Employee browser: authenticated questions and cited answers -> Citation resolver: reauthorize source links on click without exposing restricted titles 
- Citation resolver: reauthorize source links on click without exposing restricted titles  -> Authorization service: identity-aware ACL evaluation, source checks where required, fail
- Citation resolver: reauthorize source links on click without exposing restricted titles  -> Source systems: wiki, drive, tickets, chat, and docs with native permissions
- API gateway and query orchestrator: OIDC identity, rate limits, deadlines, no persisted th -> Telemetry privacy filter: allowlisted timings, coarse error codes, random request trace I
- Kafka ingestion queues: durable ID-and-version events, retries, and dead-letter queue -> Telemetry privacy filter: allowlisted timings, coarse error codes, random request trace I
- Priority security updater: permission revocations and deletions, independent of extractio -> Telemetry privacy filter: allowlisted timings, coarse error codes, random request trace I
- Answer validator and delivery gate: citation provenance, claim-support checks, permission -> Telemetry privacy filter: allowlisted timings, coarse error codes, random request trace I
- Telemetry privacy filter: allowlisted timings, coarse error codes, random request trace I -> Observability and evaluation: sanitized operational events retained 30 days; aggregate la

## Scorecard

Overall: Strong Senior performance with careful permission enforcement, grounded answers, and detailed failure handling. You connected design choices to meaningful tests and cost tradeoffs, and corrected earlier assumptions clearly. The main remaining improvement is closing the latency budget around sentence validation.

- **Requirements and estimation**: 4/4. You clarified workload and policy assumptions, calculated capacity consistently, and tested OCR sizing against a concrete stress scenario.
- **Ingestion and retrieval**: 4/4. You justified hybrid retrieval, tailored chunks to source structure, and proposed measured comparisons with a safe reranking fallback.
- **Grounded answers and citations**: 3/4. You explained citation provenance, claim verification, and abstention well, but left validation time outside the revised first-sentence budget.
- **Freshness and reliability**: 4/4. You handled publication races, stale workers, dependency outages, and recovery with explicit correctness rules and clear availability tradeoffs.
- **Cost, operations and evolution**: 4/4. You quantified verifier and migration costs, protected confidential telemetry, and explained when measured benefits justify additional spending.
- **Evaluation and quality**: 4/4. You combined labeled retrieval tests, human-reviewed answer checks, adversarial cases, and release-blocking regressions rather than relying on model judgments alone.
- **Safety and security**: 4/4. You enforced access before model exposure, bounded revocation lag, rebuilt revoked contexts, and tested injection defenses without trusting the verifier as a security boundary.
