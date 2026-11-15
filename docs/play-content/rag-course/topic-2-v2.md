# Topic 2: Embeddings and the vector store, v2 (replaces all Topic 2 slides and questions)

Slide bodies support short paragraphs, bullet lists and numbered lists. Keep the wording as written.
Diagrams: clean vector SVG, Inter, theme colors, square boxes, clear arrows. Landscape at desktop (max 200 px tall), portrait below 600 px wide. Gold marks the thing to notice.

## Slides

### S1. What an embedding really is
An embedding is a point in a learned vector space. Each number is one **dimension**, or coordinate. 768 dimensions means 768 coordinates; 1,536 means 1,536. Neither number counts words, documents or named concepts.

- **Meaning is distributed:** many coordinates work together to represent learned relationships in text.
- **Related text can be close:** "claim a chair" may sit near "furniture reimbursement" despite different words.
- **Dimensions have a cost:** more coordinates need more storage, but do not guarantee better retrieval.
- **Use compatible encoders:** different models' spaces cannot be mixed, even if their vectors have the same length.

#### Deep dive: Dimensions are coordinates; meaning comes from the whole vector
A **vector** is an ordered list of numbers. Each position is a **dimension**, like each coordinate in a point on a map. A 2D point has two coordinates, such as [0.2, 0.8]. A 768-dimensional embedding has 768 coordinates. The number 768 is not a token count, document count or number of named topics.

An embedding encoder learns a representation from training examples. Its training objective encourages useful relationships, such as questions being close to passages that answer them. The resulting coordinates represent learned patterns jointly. One coordinate is not simply "finance" and another "employees"; meaning is distributed across many numbers and their relationships.

Use a deliberately tiny illustration. Put "claim a chair" at [0.20, 0.80] and "furniture reimbursement" at [0.25, 0.75]. Put "reset my password" much farther away at [0.85, 0.10]. Nearby points illustrate how different words can express related meaning. These invented coordinates are a teaching example, not outputs from a real model or human-named meaning axes.

Real embeddings need more coordinates to represent many interacting patterns. A model producing 1,536 dimensions uses twice as many coordinates as one producing 768, with corresponding raw-storage cost at the same numeric precision. More dimensions do not automatically mean better retrieval. Training, task fit and the data matter.

A fixed-length output also does not mean unlimited input. The encoder has its own token limit. A short question and a long passage can both produce 768 numbers while preserving different amounts of useful information.

Similarity remains fallible. "Contractors qualify" and "contractors do not qualify" discuss similar ideas but give opposite answers. Measure whether nearest passages support the actual question. Never interpret distance as truth, permission or a probability of correctness.

Diagram: embedding-dimensions

### S2. Measuring "close"
A metric defines how two vectors are "close". Direction means where they point; length means how far they reach.

- **Cosine similarity:** compares direction while ignoring length. It ranges from -1 to 1; higher means more aligned.
- **Dot product:** multiplies matching coordinates and adds them. Both direction and length affect it.
- **Euclidean distance:** straight-line distance between the points. Lower means closer.

**Normalization** rescales vectors to length 1. Then cosine and dot product rank identically; Euclidean distance gives the equivalent reverse distance order.

Use the encoder's intended metric. A high score is not proof that a passage supports an answer.

#### Deep dive: Choose a similarity measure that matches the encoder
A similarity metric compares two vectors. **Direction** is where a vector points; **length**, also called magnitude, is how far it reaches from zero. Different metrics use these properties differently, so "close" must have a defined meaning.

Use a toy query q = [1, 0] and two passages A = [1, 0] and B = [2, 1]. These invented coordinates show the math, not actual text embeddings.

**Cosine similarity** compares direction and ignores length. It is the dot product divided by the product of the lengths. A points in exactly the query's direction, so its cosine is 1. B points partly sideways, so its cosine is 2 / sqrt(5), about 0.89. Cosine ranks A first. The possible range is -1 to 1, not a probability scale.

**Dot product** multiplies corresponding coordinates and adds them. The query's dot product with A is 1; with B it is 2. It ranks B first because B's greater length outweighs its less-aligned direction. Raw dot product and cosine can therefore disagree.

**Euclidean distance** is straight-line distance between the points. Here A is distance 0 from the query and B is sqrt(2), about 1.41. Smaller distance is better; larger similarity is better.

**Normalization** divides a vector by its length so its new length is 1. For unit-length vectors, dot product equals cosine, and squared Euclidean distance equals 2 minus twice the cosine. They then give equivalent neighbor orderings, with distance reversed.

Use the encoder's intended metric and preprocessing. A high similarity only identifies a promising candidate. It does not show that a passage is current, authorized or supports the answer. Choose any no-answer threshold using labeled questions, not the appearance of a score like 0.89.

Diagram: vector-metric-example

Read more: [Vector metrics and normalization](https://github.com/facebookresearch/faiss/wiki/MetricType-and-distances)

Read more: [BEIR retrieval evaluation benchmark](https://arxiv.org/abs/2104.08663)

### S3. Bi-encoders: why search is fast
A **bi-encoder** has two independent text-to-vector paths: one for the question, one for a passage. They may share a model; "bi" does not require two different models.

1. During ingestion, encode passages once and store their vectors.
2. For each question, encode it once and compare with stored vectors.

This is fast because documents need not be encoded again for every search. The output is a matching score, not a written answer. The generative LLM later reads selected passages and writes text.

Independent encodings can miss fine query-passage details. Re-ranking can inspect shortlisted pairs together.
Diagram: two lanes. Top lane, labeled "Offline": Document, Encoder, Vector index (gold). Bottom lane, labeled "Each question": Query, Encoder, Query vector. Both lanes point into a "Similarity" box, then "Top k".

#### Deep dive: Precompute documents, compare at query time
A **bi-encoder** is a retrieval architecture with two independent encoding paths: one for the question and one for a document passage. Each path turns text into a vector before the vectors are compared. The two paths may share model weights or use a jointly trained query/document pair. "Bi" does not require two different model products.

The document path runs during ingestion. For a million passages, compute a million vectors and store them in a search index. At question time, encode the new question once and search those stored vectors. You avoid reading and encoding every document again for every question.

That is its job in RAG: represent text for matching. The **generative language model** later reads selected passages and writes the answer token by token. Both can be neural text models and an embedding encoder can use a language-model backbone. The important distinction is the task and output: a searchable vector versus a generated answer.

For "Can contractors claim a chair?", the query encoder produces a vector. Search might return the contractor allowance and furniture exclusion. The answer-writing model receives their actual text and explains the rule with a citation. The vector itself is not the answer or a readable summary.

Independent encoding is efficient but loses some fine query-passage interactions. The document vector was made before anyone asked this particular question. It may blur "employees" versus "contractors" or miss a negation. A cross-encoder can inspect shortlisted query-passage pairs together to improve that ranking.

Keep the intended encoders, versions and normalization paired. A new query model cannot safely search an old index just because both vectors have the same length.

Read more: [Sentence-BERT: independent sentence encoders](https://arxiv.org/abs/1908.10084)

### S4. Choosing an embedding model
Judge models on your own data, not only on a public leaderboard like MTEB:
- **Quality:** check whether the first k results include supporting passages for real questions.
- **Domain and language:** legal, code, medical or multilingual text may need a specialized model.
- **Max input length:** longer chunks get truncated or rejected.
- **Dimensions:** more dimensions mean more memory and slower search.
- **Cost and hosting:** an API priced per token, or self-hosted. Some data can't leave your network.

#### Deep dive: Test the encoder on your own retrieval failures
Start with questions and the passages that would support their answers. Include abbreviations, exact identifiers, long sections, multiple languages and questions with no answer. Keep some examples out of model selection so repeated tuning does not simply memorize the test set.

Compare encoders on evidence retrieval at the shortlist sizes you can afford. Also measure query latency, ingestion throughput, storage size and supported input length. A strong short-passage model may silently truncate the exception at the end of a long chunk.

Use a small failure table. For "Does policy P-204 cover contractors?", record whether the current contractor section appears, its rank and any misleading older version. Inspect misses rather than choosing by one averaged benchmark number.

Version the encoder, tokenizer, normalization and chunking configuration together. Existing vectors remain in the old representation when you change the model. New query vectors cannot safely search them merely because both models output the same number of dimensions.

Before a migration, build a separate index and compare retrieval on the held-out set. A model that improves overall recall but loses a sensitive permission or language slice should not automatically replace the current one.

### S5. Memory math
Raw vector memory = number of vectors x dimensions x bytes per number.
- float32 = 4 bytes, float16 = 2, int8 = 1, binary = 1/8.
- Example: 10M chunks x 1,024 dimensions x 4 bytes = about 41 GB.

A **vector index** is the search structure over the stored vectors. Its links or lookup tables add overhead, along with IDs and metadata.

Some models let you keep only the first part of each vector (Matryoshka embeddings), for example 256 of 1,024 dimensions, with a recall cost you must measure.

#### Deep dive: Count raw vectors, then account for everything around them
Raw vector storage is **vector count × dimensions × bytes per value**. Keep the units visible so a dimension count does not accidentally become a byte count.

For 20 million chunks with 768 float32 values each, each vector uses 768 × 4 = 3,072 bytes. The raw vectors use 61.44 billion bytes, about 61.44 GB in decimal units or 57.2 GiB in binary units. "About 61 GB" is a reasonable rounded estimate if you state the convention.

This is not the total index or machine memory requirement. IDs, graph links or cluster lists, ACL metadata, deleted entries, text storage and operational headroom add space. Different index implementations keep different portions in memory or on disk. Measure a representative index rather than applying one universal multiplier.

Two full replicas double the storage for those copies. A blue-green embedding migration may temporarily need both old and new indexes as well. Copies are an explicit capacity decision, not free reliability.

If you propose lower precision, name the representation and test retrieval quality. The number of dimensions alone does not tell you bytes per vector. Keep vector capacity, document text storage and model-serving memory as separate estimates.

Diagram: vector-memory-budget

### S6. Quantization: smaller vectors
**Quantization** represents vector values with fewer bits. It saves space by keeping less numerical detail, not by deleting dimensions.

A 768-dimensional float32 vector uses 3,072 bytes. At int8, its 768 values use 768 bytes before scales and metadata. Approximation can change similarity scores and neighbor order.

- **Scalar quantization:** encode each coordinate with fewer bits.
- **Product quantization:** split coordinates into groups and store a code for each group's closest learned representative.

One option is compressed candidate search followed by higher-precision re-scoring. Include that extra copy in the memory budget. Test lost recall and latency on your data; there is no universal "small" quality loss.

#### Deep dive: Compression trades numerical detail for a smaller index
**Scalar quantization** stores each coordinate using a lower-bit encoding. A toy example maps 0.146 to a nearby representable value such as 0.15. The error is small for that value, but two very close neighbors can swap order after approximation.

Rounding the printed number while still storing float32 does not save memory. The encoding must actually use fewer bits. For 768 coordinates, float32 takes 768 × 4 = 3,072 bytes; int8 takes 768 × 1 = 768 bytes before scales, identifiers and index overhead. The vector still represents 768 dimensions.

**Product quantization**, or PQ, compresses groups of coordinates. Imagine a group of eight float32 values, which uses 32 bytes. Train a codebook of 256 representative eight-value patterns. For each group, store a one-byte code selecting its nearest representative. The codebook is shared and also uses space. The group is approximated, not preserved exactly.

Search can estimate distances from those compact codes rather than reconstruct every full vector. Stronger compression can lose useful distinctions. The result depends on the corpus, codebook training and encoding settings, not just the compression ratio.

One serving design retrieves candidates using compressed vectors, then re-scores a shortlist with higher-precision originals. This may recover some ordering accuracy, but cannot rescue evidence absent from the shortlist. Retaining originals also reduces the total memory saving.

Compare against exact full-precision search and labeled answer evidence. Measure neighbor recall, evidence recall, latency and total storage, including codebooks and any original-vector copy. Do not delete arbitrary coordinates as a substitute: dimension reduction requires a method the encoder supports.

### S7. Exact vs approximate search
**ANN means approximate nearest-neighbor search.** It finds promising nearby vectors without comparing the query with every vector.

**Exact search** checks every eligible vector under the chosen metric. It finds exact neighbors, but that does not guarantee relevant evidence. Its work grows with the collection.

**Approximate search** explores a smaller part of the index. It can be faster, but may miss some exact neighbors. Graphs and clusters are two ways to reduce the search work.

If ANN finds 9 of the exact top 10 neighbors, neighbor recall@10 is 90%. Measure recall, latency and memory together. The next slides explain graph-based HNSW and cluster-based IVF.

#### Deep dive: Approximate search needs a measurable reference
**Exact nearest-neighbor search** compares a query with every eligible vector under a chosen metric. It returns the exact nearest vectors for that representation. It does not guarantee the passages are relevant or factually correct.

**Approximate nearest-neighbor search**, often shortened to ANN, explores less of the collection to reduce work. It may miss some exact neighbors. The tradeoff is search speed and resource use versus retrieval accuracy.

For one test query, suppose exact search returns five IDs: A, B, C, D and E. ANN returns A, B, C, F and G. Neighbor recall@5 against that reference is 3/5. This differs from evidence recall, which asks whether the passages support a human-labeled answer.

Build an exact reference on a representative sample, then tune the ANN index against it. Measure latency under expected concurrency and with actual permission filters. Unfiltered single-query benchmarks can hide result starvation after access checks.

Exact search can be perfectly sensible for a small filtered collection or an evaluation baseline. ANN becomes useful when the measured cost of scanning eligible vectors is too high. Choose from observed workload needs rather than assuming every vector collection requires a complex index.

### S8. HNSW: a graph you walk
**HNSW means hierarchical navigable small world.** It is a graph-based ANN algorithm, not an embedding model.

Each node is a vector; links connect nearby vectors. Search follows promising links instead of checking every vector. Sparse upper layers move across the collection; denser lower layers refine nearby candidates.

- **M:** links per node. More links cost storage and can improve connectivity.
- **efSearch:** candidates explored per query. More exploration can improve recall at higher latency.
- **efConstruction:** build effort. More effort can improve the graph but slows indexing.

Graph storage, filters and deletions depend on the implementation. Test recall and latency with your workload.
Diagram: three stacked layers of dots (3, then 6, then 12 dots) with thin links. A gold path zigzags from a top-layer dot down through each layer to the dot nearest a star labeled "Query".

#### Deep dive: Walk a graph from broad navigation to nearby candidates
**Hierarchical navigable small world**, or HNSW, is a graph-based ANN method. Vectors are nodes with links to nearby nodes. Sparse upper layers help move across the collection; denser lower layers refine the search near promising candidates.

Imagine finding a building using a few major roads first, then local streets. The search keeps candidates that seem closer to the query and explores their neighbors. It avoids visiting every vector, but a limited exploration budget can miss a better route.

Two settings matter conceptually. More links per node can improve connectivity while increasing storage and build cost. A larger search candidate budget explores more possibilities, often improving recall at the cost of latency. Names and exact behavior vary by implementation.

Graph links add memory beyond the vectors themselves. Updates, deletions, filtering and persistence also depend on the store. Check how your implementation handles deleted nodes and rebuilds; do not promise that deleting a row instantly removes every trace from every copy.

Tune on the queries and access filters you will serve. If strict filtering leaves few permitted neighbors, evaluate filtered recall and latency explicitly. A fast graph walk that returns no allowed evidence is not a successful retrieval.

Read more: [HNSW algorithm paper](https://arxiv.org/abs/1603.09320)

### S9. IVF: search only nearby clusters
**IVF means inverted file index.** It groups vectors into clusters and searches selected groups instead of the whole collection.

A clustering method such as **k-means** repeatedly assigns vectors to nearby centers and updates those centers. Each resulting list stores one cluster's vectors.

At query time, find nearby centers and scan their lists.
- **nlist:** number of clusters. More clusters can shorten lists.
- **nprobe:** lists searched. More probes can improve recall but add work.

A relevant vector in an unsearched list can be missed. IVF can combine with product quantization to save space. Measure actual memory, filtered recall and latency rather than assuming one index always wins.
Diagram: a plane of vector dots grouped into six shaded circles. A query star is near two clusters, which are outlined in gold. Other clusters are dimmed. A true neighbor in an unsearched cluster is marked.

#### Deep dive: Search a few coarse clusters instead of the whole collection
An **inverted file index**, or IVF, partitions vectors into coarse clusters, often learned with a clustering method such as k-means. Each cluster has a representative centroid and a list of assigned vectors.

At query time, find nearby centroids and search their lists. If one million vectors are evenly split into 1,000 lists, probing 10 lists examines roughly 10,000 vectors before other optimizations. That is an illustrative average. Real lists can be uneven and filters can change the work.

Probing more lists generally improves the chance of finding exact neighbors but costs more search time. Probing too few can miss a relevant vector near a cluster boundary. Quantization can further compress the vectors within each list, introducing another quality tradeoff.

The coarse clusters must be trained on representative data. If new documents differ substantially from the training distribution, lists may become unbalanced or less useful. Monitor recall and list sizes as the corpus changes.

Compare settings against an exact reference and downstream evidence labels. Choose a probe count that meets quality and latency targets under load. The cluster count and probe count are tuning choices, not facts you can infer from document count alone.

### S10. Picking a vector store
Choose from the operations and workload you need:
- **A vector library:** search algorithms; your application owns the surrounding storage and serving contract.
- **A relational store with vector search:** can keep vectors, filters and transactional data together.
- **A dedicated vector service:** compare filtering, durability, scaling and operating options.
- **A search engine with vector support:** can combine lexical and vector retrieval.

Test current permissions, updates, deletes, backups, latency and index rebuilds. Capabilities depend on the implementation and deployment.

No tool is the right answer by name alone. State requirements, measure tradeoffs and justify the choice.

#### Deep dive: Choose the operational contract, not a fashionable database
A vector library provides search algorithms. A production store may also provide durable writes, metadata filters, replication, backups and access control. These are different responsibilities; a fast benchmark does not prove the entire storage contract.

List the operations your RAG system needs: upsert a versioned chunk, filter by tenant and ACL, remove revoked content, fetch cited text, survive a node failure and rebuild after corruption. Give each an explicit freshness or availability requirement.

Then test candidates with a realistic corpus and query mix. A relational database with vector search can simplify transactions and joins. A dedicated search service may suit larger search workloads or particular filtering needs. A standalone library may work when your application owns persistence and updates.

For example, a great unfiltered ANN result is insufficient if an ACL filter takes too long or cannot meet the revoke window. Likewise, durable source text stored elsewhere needs a consistent mapping from search IDs to current versions.

Ask about backup restoration, rolling upgrades and index rebuild time before committing. Accept any justified implementation that meets the measured contract. There is no vendor name that replaces those checks.

### S11. Filters and multi-tenant data
Real queries almost always need filters: customer, permissions, product, date.
- **Post-filtering:** take the top k, then drop what doesn't match. A strict filter can leave few or zero results.
- **Filtered search:** apply the filter during the search, so all k results pass it. Most vector stores support this.
- **Partition by tenant:** a separate index or namespace per customer. Strong isolation and easy deletes, but many small indexes to run.

Permissions belong in the search itself, never only in the prompt.
Diagram: two side-by-side funnels. Left, "Filter after": Top 10, then Filter, then "1 result" with a red X. Right, "Filter during": Search with filter, then "10 results" in gold.

#### Deep dive: Permission filtering changes the search problem
A **tenant** separates organizations. An **ACL**, or access control list, describes who may access a document. Both need to constrain retrieval. A tenant match alone does not authorize every employee to read every document in that tenant.

With post-filtering, a search might retrieve 20 attractive passages and discard 19 as forbidden. The one remaining passage may be insufficient even though useful allowed passages exist farther down the ranking. This is result starvation.

Filtering before or during candidate search can keep the search focused on allowed evidence. The available methods and performance depend on the index. Test whether the filtering path retains adequate recall rather than relying only on an API accepting a filter parameter.

Keep an authoritative permission check close to prompt construction when the index can lag revocations. A blocked passage must not enter the context, cache or citation preview. If permission verification is unavailable, do not silently fall back to an unfiltered search.

Create tests with users in overlapping and nested groups, an access revoke during a query and a warm cached result. Verify both non-disclosure and useful retrieval. Security and relevance must hold together.

### S12. Changing embedding models
A new model means a new vector space. Every document must be re-embedded; you can't mix old and new vectors.

A safe migration:
1. Build a second index with the new model in the background.
2. Write new and changed documents to both indexes.
3. Compare both on the same question set.
4. Switch reads with a flag, keep the old index for rollback, then delete it.

Store the model name and version with every vector, so a mismatch is caught early.

#### Deep dive: Migrate embeddings without mixing incompatible spaces
Treat an embedding change as an index migration. The new query encoder and document representation must agree. Matching vector dimensions do not make two embedding spaces compatible.

Build a new versioned index while the old index continues serving. Backfill source chunks through the new encoder, recording source versions and a checkpoint. Apply new document changes to both paths, or replay a change log after the bulk backfill so updates are not lost.

Use shadow queries to compare retrieval without affecting the user's answer. Test relevance, permissions, deletions and latency. A migration that improves semantic matches but serves revoked documents fails even if its average recall rises.

Cut over the query encoder and index together. Keep a routing version so each request uses a consistent pair. Retain the old pair briefly for rollback and make sure rollback still respects current permissions and source deletions.

Budget the temporary storage and embedding throughput for both indexes. Re-embedding the whole corpus competes with daily freshness work and model quotas. A resumable batch job with idempotent writes is safer than restarting millions of chunks after one worker failure.

### S13. Interview checklist
When asked "How would you store and search the vectors?", cover:
- The embedding model and how you'd test it on your data
- Vector count, dimensions and the memory math
- The index type and its recall versus latency knobs
- Filters and permissions inside the search
- How you'd re-embed when the model changes

Showing the memory math ("10M x 1,024 x 4 bytes is about 41 GB, so int8 gets us to about 10 GB") is a strong Senior signal.

## Questions

T2-Q1 · Fast search
Slide: S3
Why is bi-encoder retrieval fast enough for millions of documents?
- ✓ Document vectors are precomputed, so only the query is embedded live
- The model reads the query together with each document in a single pass
- Documents are matched by keyword first, then embedded on the fly
- Vectors are compressed so tightly that comparisons cost nothing
Key idea: Precompute document vectors once; only the query is encoded at search time.
Why: Comparing vectors is cheap. Running a model on every document per query is not.
If wrong (The model reads the query together with each document in a single pass): That's a cross-encoder. It's accurate but far too slow for millions of documents.
If wrong (Documents are matched by keyword first, then embedded on the fly): Only the query is embedded at search time. Document vectors already exist.
If wrong (Vectors are compressed so tightly that comparisons cost nothing): Compression saves memory. The speed comes from precomputing document vectors.

T2-Q2 · Cosine score
Slide: S2
Two embeddings have a cosine similarity of 0.92. What does that tell you?
- ✓ The model places the two texts very close in meaning
- About 92% of the words in the two texts are the same
- An answer built from them is 92% likely to be correct
- The two documents are 92% of the way to being identical
Key idea: Cosine measures the angle between meanings, not word overlap or correctness.
Why: Two texts with different words can score high if they mean the same thing.
If wrong (About 92% of the words in the two texts are the same): Cosine compares vector directions. Texts can score high with no shared words.
If wrong (An answer built from them is 92% likely to be correct): Similarity says the texts are related, not that an answer is right.
If wrong (The two documents are 92% of the way to being identical): Cosine isn't a percentage of sameness. It reflects a small angle between vectors.

T2-Q3 · Float32 memory (math)
Slide: S5
10M chunks, 1,024 dimensions, stored as float32. About how much raw vector memory?
- ✓ 41 GB
- 10 GB
- 82 GB
- 4 GB
Key idea: Size = vectors x dimensions x bytes per number.
Why: 10M x 1,024 x 4 bytes = about 41 GB.
If wrong (10 GB): That forgets the 4 bytes per float32 number.
If wrong (82 GB): That uses 8 bytes per number. float32 is 4 bytes.
If wrong (4 GB): Check the zeros: 10M x 1,024 is about 10 billion numbers.

T2-Q4 · Int8 memory (math)
Slide: S6
The same 10M x 1,024 vectors stored as int8 instead of float32. About how much memory?
- ✓ 10 GB
- 41 GB
- 20 GB
- 5 GB
Key idea: int8 uses 1 byte per number, a quarter of float32.
Why: 10M x 1,024 x 1 byte = about 10 GB.
If wrong (41 GB): That's still float32 at 4 bytes per number.
If wrong (20 GB): That's float16 at 2 bytes per number.
If wrong (5 GB): int8 is 1 byte per number, not half a byte.

T2-Q5 · HNSW vs IVF
Slide: S8
Which statement about HNSW and IVF is true?
- ✓ HNSW usually gives high recall at low latency but needs more memory
- IVF compares each query with every vector, which is why recall is high
- HNSW returns exact results, so its recall is always a perfect 100%
- IVF has no tuning knobs, so its recall is fixed when the index is built
Key idea: Every ANN index trades recall, speed and memory.
Why: HNSW keeps a graph in memory. IVF scans only nearby clusters and is tuned with nprobe.
If wrong (IVF compares each query with every vector, which is why recall is high): IVF scans only the nprobe nearest clusters. That's why it's fast.
If wrong (HNSW returns exact results, so its recall is always a perfect 100%): HNSW is approximate. It can miss true neighbors; efSearch trades recall for speed.
If wrong (IVF has no tuning knobs, so its recall is fixed when the index is built): nprobe is IVF's main knob. Raise it for recall, lower it for speed.

T2-Q6 · Model mismatch
Slide: S12
Spot the flaw: queries now use a new embedding model, but the document vectors were made with the old one.
- ✓ The vectors live in different spaces; re-embed the documents
- It only adds some latency until the query cache warms up
- The query cache needs clearing, but the index itself is fine
- The LLM will notice the mismatch and correct the final answer
Key idea: Queries and documents must share one embedding model.
Why: Each model has its own vector space. Mixing them gives close to random results.
If wrong (It only adds some latency until the query cache warms up): Speed isn't the problem. The similarity scores become close to random.
If wrong (The query cache needs clearing, but the index itself is fine): The index is the problem. Its vectors came from the old model.
If wrong (The LLM will notice the mismatch and correct the final answer): The LLM only sees what retrieval returns. Bad retrieval means bad context.

T2-Q7 · IVF recall
Slide: S9
Your IVF index finds only 8 of the true top 10 (compared with exact search). Which knob helps most?
- ✓ Raise nprobe so each query scans more clusters
- Lower the dimensions so the search runs faster
- Shorten the chunks so each vector is more precise
- Raise the LLM temperature for more varied answers
Key idea: nprobe is IVF's recall versus speed dial.
Why: Scanning more clusters finds more true neighbors, at the cost of more comparisons.
If wrong (Lower the dimensions so the search runs faster): Fewer dimensions loses information. It won't help IVF find the missed neighbors.
If wrong (Shorten the chunks so each vector is more precise): Chunk size changes what's indexed, not how well IVF finds the true neighbors.
If wrong (Raise the LLM temperature for more varied answers): Temperature affects generation, not retrieval.

T2-Q8 · Filter after search (new)
Slide: S11
Spot the flaw: search returns the top 10 chunks, then removes the ones the user can't access. Some users get zero results.
- ✓ A filter after search can drop all 10; filter during the search
- The embedding model doesn't understand permissions; retrain it
- Ten is too few; always fetch the top 1,000 and filter after that
- Users with zero results should get a cached answer from other users
Key idea: Apply filters inside the search, not after it.
Why: When most chunks are off-limits, the top 10 can all be filtered out. Filtered search returns 10 allowed results.
If wrong (The embedding model doesn't understand permissions; retrain it): Models don't do access control. Permissions are metadata filters.
If wrong (Ten is too few; always fetch the top 1,000 and filter after that): Fetching more helps a little but still fails for strict filters, and it costs latency.
If wrong (Users with zero results should get a cached answer from other users): That hides the bug and can leak content the user isn't allowed to see.

T2-Q9 · Re-embedding cost (math, new)
Slide: S12
You switch embedding models and must re-embed 20M chunks of about 400 tokens each. At $0.02 per million tokens, about how much does it cost?
- ✓ $160
- $16
- $1,600
- $160,000
Key idea: Re-embedding is usually cheap in API cost. Time, rate limits and running two indexes are the real cost.
Why: 20M x 400 = 8 billion tokens = 8,000 million tokens x $0.02 = $160.
If wrong ($16): Check the zeros: 8 billion tokens is 8,000 million, not 800 million.
If wrong ($1,600): That uses $0.20 per million tokens.
If wrong ($160,000): That prices per thousand tokens. The rate is per million.

T2-Q10 · Binary vectors (new)
Slide: S6
You switch to 1-bit binary vectors to save memory, and recall drops. What's the standard fix?
- ✓ Fetch about 100 candidates, then re-score them at full precision
- Go back to float32 for every vector, since binary can never work well
- Add more dimensions to the binary vectors so they hold more detail
- Return only the top 3 results so that fewer mistakes are visible
Key idea: Search small, re-score precise.
Why: Binary search is a cheap first pass. Re-scoring 100 candidates with full vectors recovers most of the lost recall.
If wrong (Go back to float32 for every vector, since binary can never work well): That gives up the 32x memory saving. Re-scoring keeps both.
If wrong (Add more dimensions to the binary vectors so they hold more detail): The model sets the dimensions. Re-scoring is the usual fix.
If wrong (Return only the top 3 results so that fewer mistakes are visible): That hides the problem and lowers recall even more.
