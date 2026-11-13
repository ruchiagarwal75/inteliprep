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

### S2. The serving architecture
A typical request path:
1. **API gateway:** sign-in checks and rate limits.
2. **RAG service:** rewrite, retrieve, re-rank, build the prompt.
3. **Vector and keyword indexes,** often both.
4. **Re-ranker service,** usually on GPUs.
5. **LLM:** a hosted API or self-hosted GPUs.

Separately, an ingestion pipeline keeps the indexes fresh through a queue. Keep the online path stateless, so you can add servers as traffic grows.
Diagram: two rows. Top row, "Online": Client, Gateway, RAG service, then two boxes stacked ("Indexes" and "Re-ranker"), then LLM, with a return arrow "Streamed answer" to Client. Bottom row, "Offline": Sources, Queue, Ingestion workers, with an arrow up into the gold "Indexes" box shared by both rows.

### S3. Freshness: how stale is OK?
Set a freshness target per source. For example:
- Pricing and policy pages: searchable within 5 minutes of a change.
- Wiki pages: within 1 hour.
- Archived documents: daily is fine.

Measure **index lag**: the time from a source edit until the change is searchable. Alert when it misses the target.
Diagram: a timeline. "Doc edited", then "Event", then "Queue", then "Embed", then "Searchable". A gold bracket spans from "Doc edited" to "Searchable", labeled "Index lag (target: 5 min)".

### S4. Streaming updates
- Prefer change events (webhooks, change data capture) over full re-crawls.
- Put changes on a queue, so bursts don't overload the embedding service.
- Make every update idempotent: replaying the same event gives the same result.
- Upsert by document ID, and remove the old chunks in the same step (Topic 1).
- Run a regular reconciliation job to catch missed events.

### S5. Scaling the vector index
When one machine isn't enough:
- **Sharding:** split the vectors across machines. Each query goes to every shard, and the results are merged. The slowest shard sets the latency.
- **Replication:** copy each shard, so more machines can serve reads and one can fail safely.
- **Tenant partitions:** large customers get their own shard or namespace.

Do the memory math first (Topic 2): 100M vectors x 768 dimensions x 4 bytes is about 307 GB raw, before index overhead.
Diagram: "Query" into a "Router", which fans out to 4 shard columns. Each column shows a shard box with a lighter replica box behind it. All 4 feed a gold "Merge top k" box.

### S6. Caching
Cache at several layers:
- **Embedding cache:** the same query text always gets the same vector.
- **Retrieval cache:** the same query and filters give the same results, for a short time.
- **Answer cache:** exact or close matches, with the user's permissions in the key (Topic 6).

Every cache needs an expiry, and must be cleared or versioned when the index or prompt changes. A stale cache quietly undoes all your freshness work.

### S7. Latency budgets and p95
Users feel the slow tail, not the average. Set a budget per step, and track p95 and p99, not just p50.

Example p95 budget: rewrite 250 ms, embed 30, retrieve 60, re-rank 120, build prompt 20, and the LLM's first token 800. That's about 1.3 s to the first word.

Tactics: run keyword and vector search in parallel, put a timeout on every call, and skip optional steps (like query rewriting) when you're running late.

### S8. Rate limits and capacity
LLM providers limit requests and tokens per minute.
- Estimate peak load: questions per second x tokens per question.
- Queue requests, and retry with backoff and jitter when you hit a limit.
- Spread load across regions or providers for headroom.
- Protect yourself too: per-user limits stop one user, or one script, from using the whole quota.

### S9. Graceful degradation
When a part fails, return something useful instead of an error:
- Re-ranker down: use the first-stage order.
- Vector search slow: fall back to keyword search only.
- Main LLM down or rate-limited: switch to a backup model.
- Everything down: show the top search results as links, with no generated answer.

Timeouts and circuit breakers stop one slow dependency from stalling every request.
Diagram: a staircase going down from left to right with 5 steps: gold "Full answer", then "No re-rank" (label "re-ranker down"), "Keyword only" (label "vector search slow"), "Backup model" (label "LLM down"), "Links only" (label "everything down").

### S10. Multi-tenant isolation
In a B2B product, many customers share one system.
- Every chunk carries a tenant ID, and every query filters on it, in the data layer, not in the prompt.
- Large tenants can get their own index. Small ones share, with strict filters.
- Track rate limits and cost per tenant.
- Test isolation: a query from tenant A must never return tenant B's chunks, even with a prompt bug.

### S11. Observability
Trace every request:
- The query and rewritten query, retrieved chunk IDs and scores, re-rank order, prompt version, model, token counts, latency per step, and the final answer.
- Dashboards: p95 latency per step, cost per day, index lag, refusal rate and error rate.
- Alerts: index lag, error spikes and cost spikes.

Mask personal data in logs, and set a retention period.

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
