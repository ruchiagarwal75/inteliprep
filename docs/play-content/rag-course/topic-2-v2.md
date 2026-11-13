# Topic 2: Embeddings and the vector store, v2 (replaces all Topic 2 slides and questions)

Slide bodies support short paragraphs, bullet lists and numbered lists. Keep the wording as written.
Diagrams: clean vector SVG, Inter, theme colors, square boxes, clear arrows. Landscape at desktop (max 200 px tall), portrait below 600 px wide. Gold marks the thing to notice.

## Slides

### S1. What an embedding really is
An embedding model turns text into a fixed-length list of numbers, for example 768 or 1,536 of them. Texts with similar meaning land close together.
- The length is set by the model, whether the input is 5 words or 500.
- Every model has its own space. A vector from model A can't be compared with one from model B.
- Retrieval can never be better than the embedding model. If it can't tell two meanings apart, no index can.

### S2. Measuring "close"
- **Cosine similarity:** the angle between two vectors, from -1 to 1. Length doesn't matter.
- **Dot product:** angle times length. Ranks the same as cosine when vectors are normalized to length 1.
- **Euclidean (L2) distance:** straight-line distance. For normalized vectors, it also ranks the same as cosine.

Use the metric the model was trained for. Most text models are used with normalized vectors and cosine or dot product.
Diagram: a 2D plot with three arrows from the origin. "Refund policy" and "Get my money back" point in almost the same direction, with a small angle between them marked in gold. "Office chair" points far away.

### S3. Bi-encoders: why search is fast
The query and each document are encoded separately. Document vectors are computed once, at indexing time, and stored.

At question time you only:
1. Embed the query (one fast model call).
2. Compare it with the stored vectors.

The catch: the model never reads the query and the document together, so it misses fine details. Topic 4 (re-ranking) fixes that for the top results.
Diagram: two lanes. Top lane, labeled "Offline": Document, Encoder, Vector index (gold). Bottom lane, labeled "Each question": Query, Encoder, Query vector. Both lanes point into a "Similarity" box, then "Top k".

### S4. Choosing an embedding model
Judge models on your own data, not only on a public leaderboard like MTEB:
- **Quality:** recall@k on 100 to 200 real questions with known right chunks.
- **Domain and language:** legal, code, medical or multilingual text may need a specialized model.
- **Max input length:** longer chunks get truncated or rejected.
- **Dimensions:** more dimensions mean more memory and slower search.
- **Cost and hosting:** an API priced per token, or self-hosted. Some data can't leave your network.

### S5. Memory math
Raw vector memory = number of vectors x dimensions x bytes per number.
- float32 = 4 bytes, float16 = 2, int8 = 1, binary = 1/8.
- Example: 10M chunks x 1,024 dimensions x 4 bytes = about 41 GB.

The index adds more on top, for example the links in an HNSW graph.

Some models let you keep only the first part of each vector (Matryoshka embeddings), for example 256 of 1,024 dimensions, for a small recall cost.

### S6. Quantization: smaller vectors
- **float16:** half the memory, almost no recall loss.
- **int8:** a quarter of the memory, a small recall loss.
- **Product quantization (PQ):** splits each vector into pieces and stores a short code per piece. Often 30x smaller or more, with more recall loss.
- **Binary:** 1 bit per dimension, 32x smaller. Use it only with re-scoring.

The common pattern: search the small vectors for the top 100 candidates, then re-score those with full-precision vectors. You keep most of the recall for a fraction of the memory.

### S7. Exact vs approximate search
Exact search compares the query with every vector. It's perfect, and fine for small collections, but too slow at 100M vectors.

Approximate nearest neighbor (ANN) indexes check only a small part of the data and still find most true neighbors.
- **Recall@10 = 95%** means the index found, on average, 9.5 of the true top 10.
- Every ANN index trades **recall, latency and memory**. You tune for two; you pay with the third.

### S8. HNSW: a graph you walk
HNSW stacks layers of graphs: a few long links at the top, dense links at the bottom. A search starts at the top, walks toward the query, and drops down a layer at a time.
- **M:** links per node. Higher means better recall and more memory.
- **efSearch:** candidates explored per query. Higher means better recall and more latency.
- **efConstruction:** build effort. Higher means a better graph and a slower build.

Strengths: high recall at low latency, easy inserts. Weaknesses: the graph lives in memory, and deletes are usually only marked, then cleaned up later.
Diagram: three stacked layers of dots (3, then 6, then 12 dots) with thin links. A gold path zigzags from a top-layer dot down through each layer to the dot nearest a star labeled "Query".

### S9. IVF: search only nearby clusters
IVF groups vectors into clusters with k-means, for example 4,096 clusters. Each vector goes into the list of its nearest cluster center.

At question time, it finds the closest few centers and scans only their lists.
- **nlist:** number of clusters. More clusters means shorter lists to scan.
- **nprobe:** clusters scanned per query. Higher means better recall and more latency.

IVF uses less memory than HNSW and pairs well with PQ (IVF-PQ) for billion-scale sets. Its weakness: a true neighbor in a cluster you didn't scan is missed.
Diagram: dots in 6 clusters, each with a center marker. A star labeled "Query". The 2 nearest clusters are outlined in gold with the label "nprobe = 2". One dot just across the border in an unscanned cluster is labeled "Missed".

### S10. Picking a vector store
- **A library (FAISS, hnswlib):** fastest, but you build storage, updates, filters and scaling yourself.
- **Postgres with pgvector:** vectors next to your data, with SQL filters and transactions. Great when you already run Postgres and the data fits on one machine.
- **A vector database (Pinecone, Weaviate, Qdrant, Milvus):** built-in sharding, filtering and managed scaling.
- **A search engine (Elasticsearch, OpenSearch):** strong keyword search plus vector search in one place, which helps hybrid retrieval (Topic 3).

Interview tip: state the needs first (scale, filters, update rate, latency, team skills), then pick a tool.

### S11. Filters and multi-tenant data
Real queries almost always need filters: customer, permissions, product, date.
- **Post-filtering:** take the top k, then drop what doesn't match. A strict filter can leave few or zero results.
- **Filtered search:** apply the filter during the search, so all k results pass it. Most vector stores support this.
- **Partition by tenant:** a separate index or namespace per customer. Strong isolation and easy deletes, but many small indexes to run.

Permissions belong in the search itself, never only in the prompt.
Diagram: two side-by-side funnels. Left, "Filter after": Top 10, then Filter, then "1 result" with a red X. Right, "Filter during": Search with filter, then "10 results" in gold.

### S12. Changing embedding models
A new model means a new vector space. Every document must be re-embedded; you can't mix old and new vectors.

A safe migration:
1. Build a second index with the new model in the background.
2. Write new and changed documents to both indexes.
3. Compare both on the same question set.
4. Switch reads with a flag, keep the old index for rollback, then delete it.

Store the model name and version with every vector, so a mismatch is caught early.

### S13. Interview checklist
When asked "How would you store and search the vectors?", cover:
- The embedding model and how you'd test it on your data
- Vector count, dimensions and the memory math
- The index type and its recall versus latency knobs
- Filters and permissions inside the search
- How you'd re-embed when the model changes

Doing the memory math out loud ("10M x 1,024 x 4 bytes is about 41 GB, so int8 gets us to about 10 GB") is a strong Senior signal.

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
