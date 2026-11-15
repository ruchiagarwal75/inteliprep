# Topic 8: Freshness, scale and serving, v1 (new topic)

Slide bodies support short paragraphs, bullet lists and numbered lists. Keep the wording as written.
Diagrams: clean vector SVG, Inter, theme colors, square boxes, clear arrows. Landscape at desktop (max 200 px tall), portrait below 600 px wide. Gold marks the thing to notice.

## Slides

### S1. From demo to production
A demo answers one person from one laptop. Production must:
- Keep the index fresh as documents change.
- Serve many users at low latency.
- Stay up when a dependency fails.
- Keep the cost per question predictable.

This topic covers the system around the RAG pipeline.

#### Deep dive: A working request is not yet a reliable service
A demo proves one question can complete. Production must handle overlapping requests, document updates, slow dependencies, permission changes and failures without unbounded work or stale evidence.

Separate the online answer path from background ingestion. A document upload should not block every query while parsing and embedding finish. A query should know which published index and permission version it uses.

Bound concurrency and queues. If arrivals exceed processing capacity, an unlimited queue turns a short overload into minutes of waiting. Define admission limits, deadlines and a clear overloaded response.

For example, a model slowdown increases the number of in-flight answers even if question rate stays constant. That can exhaust connections or memory elsewhere in the service. Capacity planning needs latency and concurrency, not only requests per second.

Use realistic load and dependency failures when testing. Track end-to-end success, freshness and support quality. A fast healthy path does not show whether the system degrades safely when retrieval or authorization becomes unavailable.

### S2. The serving architecture
A typical request path:
1. **API gateway:** sign-in checks and rate limits.
2. **RAG service:** rewrite, retrieve, re-rank, build the prompt.
3. **Vector and keyword indexes,** often both.
4. **Re-ranker service,** sized and hosted for its measured workload.
5. **LLM:** a hosted API or self-hosted GPUs.

Separately, an ingestion pipeline keeps the indexes fresh through a queue. Serving workers can be stateless; keep history, versions and request outcomes in durable stores.
Diagram: two rows. Top row, "Online": Client, Gateway, RAG service, then two boxes stacked ("Indexes" and "Re-ranker"), then LLM, with a return arrow "Streamed answer" to Client. Bottom row, "Offline": Sources, Queue, Ingestion workers, with an arrow up into the gold "Indexes" box shared by both rows.

#### Deep dive: Keep synchronous serving and asynchronous ingestion separate
The online path authenticates the user, retrieves allowed evidence, ranks it, builds context and streams an answer. It needs a request deadline and a bounded amount of work.

The background path reads source changes, parses content, creates chunks, computes embeddings and publishes updated indexes. It needs durable checkpoints, retries and idempotent writes so a worker restart does not duplicate or lose documents.

Some serving components can be stateless workers, but conversation history, task status and index versions still need durable stores. A restarted worker should not invent a new conversation or forget which answer was already produced.

Use backpressure when ingestion or inference falls behind. A queue can absorb a brief burst, but it does not create unlimited processing capacity. Monitor queue age as well as queue length.

Give authorization its own explicit failure behavior. If permission verification is unavailable, do not continue with unrestricted evidence to keep answers flowing. Reliability means preserving the security contract while explaining temporary unavailability.

### S3. Freshness: how stale is OK?
Set a freshness target per source. For example:
- Pricing and policy pages: searchable within 5 minutes of a change.
- Wiki pages: within 1 hour.
- Archived documents: daily is fine.

Measure **index lag**: the time from a source edit until the change is searchable. Alert when it misses the target.
Diagram: a timeline. "Doc edited", then "Event", then "Queue", then "Embed", then "Searchable". A gold bracket spans from "Doc edited" to "Searchable", labeled "Index lag (target: 5 min)".

#### Deep dive: Measure freshness from source change to visible behavior
Freshness is the delay between a source change and the user seeing its effect. It includes connector polling, queueing, parsing, embedding, index publication and cache invalidation.

If a policy edit occurs at 10:00 and becomes searchable at 10:08, the end-to-end lag is eight minutes. An embedding worker finishing in one minute does not prove a one-minute freshness target if the connector polls every hour.

Document updates, deletions and permission revocations can require different deadlines. A stale paragraph may be tolerable for a low-risk task; returning text after access is revoked may violate the security contract.

Track a source version through the pipeline. Publish a coherent version so retrieval does not combine new text with old permissions. For revocations, consider a current access check before context construction while index metadata catches up.

Report lag distributions and worst delayed sources, not only average worker speed. A quiet connector with a broken checkpoint can leave one collection stale while the rest of the pipeline looks healthy.

### S4. Streaming updates
- Prefer change events (webhooks, change data capture) over full re-crawls.
- Put changes on a queue, so bursts don't overload the embedding service.
- Make every update idempotent: replaying the same event gives the same result.
- Use document and source-version identities. Publish a complete new version, then retire old chunks using the store's actual consistency guarantees (Topic 1).
- Run a regular reconciliation job to catch missed events.

#### Deep dive: Use versions and idempotency to survive replayed changes
Change feeds may deliver duplicates, arrive out of order or pause during an outage. Treat events as updates to versioned state rather than assuming one perfect delivery per edit.

An idempotent upsert uses a stable document and chunk identity so replaying the same version produces the same result. Version checks prevent an old delayed update from overwriting a newer document.

A **tombstone** records a deletion so replayed older events cannot resurrect removed content. Propagate deletion to vector and keyword indexes, caches and source mappings. Keep the source-of-truth rules explicit.

Persist a checkpoint only after the intended change is durable. If a worker crashes halfway through a document, retrying should finish or replace that version safely. Publishing a document atomically avoids exposing a mix of old and new chunks.

Test downtime and replay with permission changes included. A recovered pipeline must catch up without briefly making deleted or revoked evidence available. Queue throughput alone does not prove correct recovery.

### S5. Scaling the vector index
When one machine isn't enough:
- **Sharding:** split the vectors across machines. Queries merge the relevant shards' results. Fan-out, skew and the slowest participating shard can affect latency.
- **Replication:** copy each shard, so more machines can serve reads and one can fail safely.
- **Tenant partitions:** large customers get their own shard or namespace.

Do the memory math first (Topic 2): 100M vectors x 768 dimensions x 4 bytes is about 307 GB raw, before index overhead.
Diagram: "Query" into a "Router", which fans out to 4 shard columns. Each column shows a shard box with a lighter replica box behind it. All 4 feed a gold "Merge top k" box.

#### Deep dive: Shards divide data; replicas copy it
A **shard** stores part of the collection. A **replica** stores another copy of a shard for availability or read capacity. These choices change query fan-out, memory and failure handling.

If every query needs all shards, the service must merge their candidates. The slowest participating shard can dominate latency. Tenant routing or known partitions can reduce fan-out, but only when they still include all relevant permitted evidence.

For an illustrative 300 GB vector payload split evenly over six shards, each holds about 50 GB before overhead. Two full copies require about 600 GB of raw payload across the deployment. Real distributions may be skewed by tenant or document size.

Test filtered retrieval and hot tenants. Equal document counts do not guarantee equal query load. A large tenant or frequently requested source can overload one shard while others are idle.

Plan rebalancing, rebuilds and node loss. Replication does not automatically make updates, permission changes or failover consistent. Specify which version a query can read and how stale copies are prevented from leaking revoked content.

### S6. Caching
Cache at several layers:
- **Embedding cache:** reuse a vector only when query text, preprocessing and encoder version match.
- **Retrieval cache:** the same query and filters give the same results, for a short time.
- **Answer cache:** exact or close matches, with the user's permissions in the key (Topic 6).

Every cache needs an expiry, and must be cleared or versioned when the index or prompt changes. A stale cache quietly undoes all your freshness work.

#### Deep dive: Cache keys must include the facts that change the answer
Different caches save different work: query embeddings, retrieval candidates, reranker scores, prompt computation or full answers. Their validity rules are not interchangeable.

A safe retrieval or answer key may need tenant, normalized query, user or permission scope, source/index version and model/prompt version. The exact key depends on what was cached. User ID alone does not protect against that user's later access revoke.

For example, a cached answer generated from a restricted policy must not reach another user. Even for the same user, recheck current access or invalidate the entry when permissions change. Cache hits cannot bypass authorization.

Use TTLs as one freshness control, not the only revoke mechanism when the target is stricter. A five-minute TTL cannot meet a one-minute revoke requirement by itself.

Measure hit rate and saved work alongside stale-result and permission tests. A cache that rarely hits but is easy to validate may be better than a broad shared answer cache with unclear security boundaries.

Diagram: permission-revoke-race

### S7. Latency budgets and p95
Users feel the slow tail, not the average. Set a budget per step, and track p95 and p99, not just p50.

Example p95 budget: rewrite 250 ms, embed 30, retrieve 60, re-rank 120, build prompt 20, and the LLM's first token 800. These stage allowances total about 1.3 s. Measure end-to-end p95 separately; adding stage p95s does not give the p95 of the sum.

Tactics: run keyword and vector search in parallel, put a timeout on every call, and skip optional steps (like query rewriting) when you're running late.

#### Deep dive: Tail latency describes the whole request distribution
The p95 latency is a value at or below which roughly 95% of measured requests finish. It does not describe the slowest 5%, and it is different from the average.

Stage percentiles do not add into an end-to-end percentile. The slowest retrieval requests may not be the slowest generation requests. Dependencies and shared overload can also correlate delays. Measure the full request directly.

Use stage budgets to guide engineering. For an illustrative one-second first-token goal, allocate time to authentication, retrieval, reranking, prompt construction and model prefill, with room for network and queueing. Test whether the actual end-to-end distribution meets it.

Keep conditions visible: concurrency, input/output lengths, cache warmth and errors. Excluding timed-out requests can make latency look better while the service becomes less reliable.

When p95 rises, traces help locate queueing and dependency waits. Optimize the measured bottleneck rather than the stage with the most interesting algorithm.

### S8. Rate limits and capacity
LLM providers limit requests and tokens per minute.
- Estimate peak load: questions per second x tokens per question.
- Queue requests, and retry with backoff and jitter when you hit a limit.
- Spread load across regions or providers for headroom.
- Protect yourself too: per-user limits stop one user, or one script, from using the whole quota.

#### Deep dive: Tokens and in-flight work can limit capacity before QPS does
A model service can limit requests per second, tokens per minute and concurrent requests separately. Staying below one limit does not guarantee staying below the others.

For an illustrative 100 requests per second at 4,000 input and 500 output tokens each, traffic is about 27 million tokens per minute. Check how the provider counts input, output and reserved tokens rather than assuming one combined quota.

Concurrency grows with response time. At a stable 10 requests per second and an average five-second response, roughly 50 requests are in flight. A slowdown to ten seconds roughly doubles that number if arrivals continue.

Bound queues and use per-user or tenant budgets. Retry transient failures with limited attempts and jitter, which spreads retry timing. Retrying every rejected request immediately can amplify overload.

Track rejected work, queue age and token usage. Give users a clear retry time when available. A capacity plan should explain which limit is reached first and how the product degrades without dropping security checks.

### S9. Graceful degradation
When a part fails, return something useful instead of an error:
- Re-ranker down: use the first-stage order.
- Vector search slow: fall back to keyword search only.
- Main LLM down or rate-limited: switch to a backup model.
- LLM unavailable but authorized search healthy: show source links without generation. If authorization or every search path is down, fail safely with a clear retry message.

Timeouts and circuit breakers stop one slow dependency from stalling every request.
Diagram: a staircase going down from left to right with 5 steps: gold "Full answer", then "No re-rank" (label "re-ranker down"), "Keyword only" (label "vector search slow"), "Backup model" (label "LLM down"), "Links only" (label "everything down").

#### Deep dive: Decide the safe reduced service before an outage
Graceful degradation keeps a useful subset of behavior when a dependency fails. It needs an explicit contract; "fall back" alone does not explain what the user receives.

If a reranker fails, a tested original retrieval order may still support an answer. If vector search fails, keyword search might work for some queries. If neither path finds supporting evidence, do not replace retrieval with an unsupported confident answer.

Authorization is different. A failed permission check must not degrade into unrestricted search or context. Explain temporary unavailability and preserve the user's request where safe.

Use timeouts within an overall deadline. A **circuit breaker** temporarily stops calls to a dependency failing repeatedly, allowing it time to recover. Pair it with bounded probes and a known fallback rather than an endless retry loop.

Test each outage with evidence and permission assertions. A degraded answer should state limits when relevant, such as only one source being available. Availability metrics alone cannot show whether the fallback remained correct and safe.

### S10. Multi-tenant isolation
In a B2B product, many customers share one system.
- Every chunk carries a tenant ID, and every query filters on it, in the data layer, not in the prompt.
- Large tenants can get their own index. Small ones share, with strict filters.
- Track rate limits and cost per tenant.
- Test isolation: a query from tenant A must never return tenant B's chunks, even with a prompt bug.

#### Deep dive: Separate organization isolation from individual permissions
Multi-tenant isolation prevents one organization from accessing another's data or consuming all shared resources. Individual ACLs still decide what each user may read within their organization.

A shared index with tenant filters can work if every path enforces them. Separate indexes or deployments can offer stronger isolation at higher operational cost. Choose based on security, residency and workload requirements, then test the chosen boundary.

Carry a server-verified tenant identity through retrieval, caches, citations and logs. Do not trust a client-supplied tenant ID without authorization. A correctly filtered query can still leak through a broadly keyed answer cache.

Budget concurrency, tokens and ingestion work per tenant to reduce noisy-neighbor effects. One large document backfill should not starve every other tenant's interactive questions.

Test cross-tenant requests, nested groups, revocations and diagnostic access. Isolation includes metadata and operational tools, not only the final answer text.

### S11. Observability
Trace every request:
- Request ID, safe evidence references and scores, re-rank order, prompt version, model, token counts and latency per step. Keep raw questions and answers only in a restricted, sampled debugging flow when needed.
- Dashboards: p95 latency per step, cost per day, index lag, refusal rate and error rate.
- Alerts: index lag, error spikes and cost spikes.

Mask personal data in logs, and set a retention period.

#### Deep dive: Trace decisions without copying the entire private conversation
Observability connects one request to its stages and versions. A trace ID can link authentication, retrieval, reranking, generation and verification timings without storing every source passage.

Useful metadata includes index and prompt versions, candidate IDs and ranks, token counts, cache status, failure categories and freshness lag. Keep access to even these identifiers controlled when they can reveal sensitive document names or relationships.

Separate operational signals from content diagnostics. General logs should not contain secrets, raw credentials or full private answers. When a text sample is needed to debug support quality, use explicit access controls, redaction, sampling and retention.

Alert on meaningful symptoms such as permission-check failures, rising queue age, stale connectors and unsupported-answer rates. A healthy model endpoint does not prove the whole RAG product is healthy.

Use traces to reconstruct the first failed boundary in a bad answer. Monitoring should help explain a specific failure and support a regression test, not create a second uncontrolled store of confidential documents.

### S12. Interview checklist
When asked "How would you run this in production?", cover:
- Event-driven ingestion with a queue, idempotent upserts and reconciliation
- A freshness target, and index lag monitoring
- Sharding and replication, with the memory math
- Caches with expiry and versioning
- p95 latency budgets, fallbacks and per-user rate limits

Naming a freshness target and how you'd measure index lag is a strong Senior signal.

## Questions

T8-Q1 · Is it fresh?
Slide: S3
Policy pages must be searchable within 5 minutes of an edit. Which metric tells you whether you're meeting that?
- ✓ Index lag: time from an edit until it's searchable
- Query latency: time from a question to the first token
- Recall@10 on the offline test set from last quarter
- The total number of chunks currently in the index
Key idea: Freshness is measured as index lag.
Why: Index lag tracks each edit from the source to search, so you can alert when it passes 5 minutes.
If wrong (Query latency: time from a question to the first token): That measures answering speed, not how fresh the index is.
If wrong (Recall@10 on the offline test set from last quarter): An old test set can't tell whether today's edits arrived.
If wrong (The total number of chunks currently in the index): A count doesn't say whether the content is current.

T8-Q2 · Index memory (math)
Slide: S5
100M chunks, 768 dimensions, stored as float32. About how much raw vector memory?
- ✓ About 307 GB
- About 77 GB
- About 31 GB
- About 3 TB
Key idea: Size = vectors x dimensions x bytes per number.
Why: 100M x 768 x 4 bytes = about 307 billion bytes, or 307 GB, before index overhead.
If wrong (About 77 GB): That's 1 byte per number. float32 is 4 bytes.
If wrong (About 31 GB): Check the zeros: 100M x 768 x 4 is about 307 billion bytes.
If wrong (About 3 TB): That's 10x too much. Recount the zeros in 100M.

T8-Q3 · Slowest shard (math)
Slide: S5
A query fans out to 8 shards in parallel. Seven reply in 20 ms, and one takes 200 ms. About how long does the search take?
- ✓ About 200 ms
- About 20 ms
- About 43 ms
- About 340 ms
Key idea: Parallel fan-out waits for the slowest shard.
Why: The merge can't finish until every shard replies, so the 200 ms shard sets the time.
If wrong (About 20 ms): That's the fast shards. The query waits for all 8.
If wrong (About 43 ms): That's the average. Fan-out waits for the slowest shard.
If wrong (About 340 ms): That's the sum. The shards run in parallel, not one after another.

T8-Q4 · Double delivery
Slide: S4
Spot the flaw: a webhook delivered the same document update twice, and now the doc has two copies of every chunk.
- ✓ Updates aren't idempotent; upsert by document and chunk ID
- Webhooks are unreliable, so go back to a nightly full re-crawl
- The queue is too slow and should process events in parallel
- The embedding model made two vectors per chunk by mistake
Key idea: Event handlers must be safe to replay.
Why: Webhooks and queues can deliver more than once. Upserting by ID makes the second delivery overwrite, not add.
If wrong (Webhooks are unreliable, so go back to a nightly full re-crawl): That trades a fixable bug for stale data all day.
If wrong (The queue is too slow and should process events in parallel): Speed isn't the issue. The second delivery should overwrite, not add.
If wrong (The embedding model made two vectors per chunk by mistake): The model did its job twice. The write should have replaced the first copy.

T8-Q5 · Tokens per minute (math)
Slide: S8
At peak you get 20 questions per second, each using about 6,000 tokens. About how many tokens per minute is that?
- ✓ About 7.2M
- About 120K
- About 720K
- About 72M
Key idea: Capacity = questions per second x tokens per question x 60.
Why: 20 x 6,000 = 120,000 tokens per second, x 60 = 7.2 million per minute.
If wrong (About 120K): That's per second. Multiply by 60 for a minute.
If wrong (About 720K): Check the zeros: 120,000 x 60 is 7.2 million.
If wrong (About 72M): That's 10x too much. 120,000 x 60 is 7.2 million.

T8-Q6 · Re-ranker down
Slide: S9
The re-ranker service is down. What should the system do?
- ✓ Skip re-ranking and use the first-stage order
- Return an error to every user until the re-ranker is back
- Wait for the re-ranker with no timeout, however long it takes
- Send all 100 candidates straight into the LLM prompt instead
Key idea: Degrade, don't fail.
Why: First-stage results are a bit less precise but still useful. Users get an answer instead of an error.
If wrong (Return an error to every user until the re-ranker is back): First-stage results are still useful. Degrade, don't fail.
If wrong (Wait for the re-ranker with no timeout, however long it takes): One slow dependency would stall every request.
If wrong (Send all 100 candidates straight into the LLM prompt instead): That's slow, expensive, and buries the answer. Send the top few.

T8-Q7 · Old prices
Slide: S6
Spot the flaw: the pricing page was re-indexed 2 minutes after an edit, but users still saw old prices for a day.
- ✓ The answer cache wasn't cleared when the index changed
- The embedding model needs retraining after every price change
- Index lag is too long, and the queue needs more workers
- Users asked about old prices, so it's working as intended
Key idea: Caches must be cleared or versioned when content changes.
Why: The index was fresh in 2 minutes. The cache kept serving answers built from the old page.
If wrong (The embedding model needs retraining after every price change): The index already had the new text. The cache served old answers.
If wrong (Index lag is too long, and the queue needs more workers): The index updated in 2 minutes. The delay came after it.
If wrong (Users asked about old prices, so it's working as intended): They asked current questions and got stale answers.

T8-Q8 · Tenant filter
Slide: S10
In a multi-tenant RAG product, where must the tenant filter be enforced?
- ✓ In the search itself, in the data layer, on every query
- In the system prompt, by telling the model which tenant it serves
- In the UI, by hiding other tenants' results before they display
- Only for large tenants, since small ones share a single index
Key idea: Isolation belongs in the data layer.
Why: If the filter runs inside the search, another tenant's chunks never leave the database, whatever the prompt says.
If wrong (In the system prompt, by telling the model which tenant it serves): Prompts can be ignored or attacked. Enforce it before the model sees anything.
If wrong (In the UI, by hiding other tenants' results before they display): The data already left the server. Filter before retrieval returns it.
If wrong (Only for large tenants, since small ones share a single index): Shared indexes need the filter most.

T8-Q9 · Rate limited
Slide: S8
Your LLM provider returns "rate limit exceeded" at peak hours. What's the best first response?
- ✓ Queue and retry with backoff and jitter, plus per-user limits
- Retry right away in a tight loop until each request gets through
- Drop the requests silently and hope that users try again later
- Raise the temperature so that each request uses fewer tokens
Key idea: Back off, spread retries, and protect your quota.
Why: Backoff with jitter avoids retry storms, and per-user limits stop one heavy user from starving everyone else.
If wrong (Retry right away in a tight loop until each request gets through): That makes the overload worse, and every client retries at once.
If wrong (Drop the requests silently and hope that users try again later): Users get nothing and no message. Queue, retry, and tell them if it's slow.
If wrong (Raise the temperature so that each request uses fewer tokens): Temperature doesn't change token use or rate limits.

T8-Q10 · Average looks fine
Slide: S7
Average latency is 900 ms, but users still complain the bot is slow. What should you look at?
- ✓ p95 and p99 latency per step, to find the slow tail
- The average again, measured over a longer time period
- The fastest 5% of requests, since they show the best case
- Total tokens per day, since cost and latency are the same thing
Key idea: Users feel the tail, not the average.
Why: A few very slow steps can hide behind a fine average. Per-step p95 and p99 show where.
If wrong (The average again, measured over a longer time period): A longer average still hides the slow requests.
If wrong (The fastest 5% of requests, since they show the best case): Users complain about the slow ones, not the fast ones.
If wrong (Total tokens per day, since cost and latency are the same thing): Cost and latency are related but different. Look at the tail.
