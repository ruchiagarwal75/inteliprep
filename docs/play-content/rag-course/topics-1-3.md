# RAG course content: topics 1 to 3

Source content for the RAG world. Each topic = slides, then multiple-choice questions. Every question has exactly 4 options, one correct (marked ✓). "Why" is shown after answering; "If wrong" lines explain a specific wrong option when the player picks it. Keep questions, answers, "Why" and "If wrong" server-only until the question is answered. Slides are not secret.

Shuffle options per attempt. Math questions are multiple choice; their wrong options are common mistakes.

---

## Topic 1: Ingestion and chunking

### Slides
1. **From documents to chunks.** Source, parse, clean, chunk, add metadata, embed, index. Search returns chunks, not whole documents.
2. **Size and overlap.** Too big: one embedding averages many ideas, so the match is weak and tokens are wasted. Too small: the chunk loses its context. A common start: 200 to 500 tokens, 10 to 20% overlap. Tune with recall@k on your own questions.
3. **Respect structure.** Split on headings. Keep tables with their header row, code blocks whole, list items with their intro line. Trick: search small chunks, send the parent section to the LLM.
4. **Metadata.** Attach source, title, section, timestamp, version and permissions to each chunk. Metadata powers filters, citations, freshness and access control.
5. **Updates and deletes.** Track chunks by document ID. Hash chunks so only changed ones are re-embedded. Deleting a document must remove its chunks. Interview tip: always say how a deleted document disappears from the index.

### Questions
T1-Q1. Why do very large chunks hurt retrieval?
- ✓ One embedding averages many topics, so the match is diluted
- Vector databases can't store them
- LLMs can't read more than 1,000 tokens
- They need more embedding dimensions
Key idea: One vector per chunk. The more ideas in a chunk, the blurrier its vector.
Why: Large chunks mix topics, so similarity to any one question drops, and they waste context tokens.

T1-Q2. You split every 300 tokens with no overlap, and a key sentence is cut in half. Best fix?
- ✓ Add 10 to 20% overlap, or split on sentence boundaries
- Use more embedding dimensions
- Use a bigger LLM
- Remove stop words
Key idea: Overlap and sentence-aware splits keep ideas whole.
Why: Neither half of a split sentence carries the full meaning. Overlap repeats the boundary text in both chunks.

T1-Q3. Spot the flaw: Markdown docs are cut every 500 tokens, splitting a pricing table in the middle.
- ✓ Rows lose their header row, so answers about the table come out wrong
- 500 tokens is too small for Markdown
- Tables can't be embedded
- The overlap is too large
Key idea: Keep tables with their headers.
Why: A row like "Pro | 49 | 10" means nothing without "Plan | Price | Seats".

T1-Q4. Which metadata lets the answer show "Source: HR Handbook, updated Mar 2026"?
- ✓ Title, source and timestamp
- The embedding vector
- The chunk overlap
- The token count
Key idea: Citations and freshness come from metadata, not from the vector.
Why: The vector is only for matching. Display info must be stored alongside it.

T1-Q5 (math). 2M documents, about 4,000 tokens each, 500-token chunks with 100-token overlap. About how many chunks?
- 16M
- ✓ 20M
- 2M
- 200M
Key idea: Chunks per doc is roughly doc tokens divided by (chunk size minus overlap).
Why: Each new chunk moves forward 400 tokens, so 4,000 / 400 = 10 chunks per doc, and 2M x 10 = 20M.
If wrong (16M): That forgets the overlap: 4,000 / 500 = 8.
If wrong (2M): That's one chunk per document.

T1-Q6. Spot the flaw: when a document is edited, its new chunks are added but its old chunks stay in the index.
- ✓ Outdated text still gets retrieved; replace a document's chunks by document ID
- The embedding model needs retraining
- Edits should be ignored
- Overlap causes this
Key idea: Updates must replace, not just add.
Why: Old chunks still match questions and return stale or conflicting answers.

T1-Q7 (math). 100K documents are edited per day, 10 chunks each, and about 2 chunks actually change per edit. With chunk hashes, how many chunks do you re-embed daily?
- 1M
- ✓ 200K
- 100K
- 2M
Key idea: Hash chunks and re-embed only what changed.
Why: 100K edits x 2 changed chunks = 200K.
If wrong (1M): That re-embeds every chunk of every edited document.

---

## Topic 2: Embeddings and the vector store

### Slides
1. **What an embedding is.** A list of numbers that captures meaning. Similar meaning, nearby vectors. Documents and queries must use the same model.
2. **Bi-encoder retrieval.** Query and documents are encoded separately (two towers) and compared with a dot product or cosine similarity. Document vectors are computed ahead of time, which is why you can search millions in milliseconds.
3. **Dimensions and memory.** Raw size = vectors x dimensions x bytes per number (float32 = 4, float16 = 2, int8 = 1). More dimensions is not always better. Quantization saves memory for a small recall cost.
4. **Approximate search (ANN).** Exact search compares every vector: too slow at scale. HNSW: a graph, fast with high recall, memory heavy. IVF: clusters, searches only a few (nprobe trades recall for speed). ScaNN: quantization plus re-scoring. Tune recall@k against p95 latency.
5. **Choosing and changing models.** Pick by evaluating on your own questions, not just a leaderboard: domain, languages, max input length, cost. A new model means re-embedding everything; run old and new indexes side by side and switch after evaluation.

### Questions
T2-Q1. Why is bi-encoder retrieval fast enough for millions of documents?
- ✓ Document vectors are computed ahead of time; a query is compared with a dot product
- It reads the full text of every document per query
- It runs the model on every document per query
- It only searches titles
Key idea: Precompute document vectors once; only the query is encoded at search time.
Why: Comparing vectors is cheap. Running a model on every document per query is not.

T2-Q2. Two embeddings have cosine similarity 0.92. What does that mean?
- ✓ The model sees them as very close in meaning
- 92% of their words overlap
- There's a 92% chance the answer is correct
- They share 92% of their tokens
Key idea: Cosine similarity measures direction of meaning, not word overlap or correctness.
Why: Two texts with different words can still score high if they mean the same thing.

T2-Q3 (math). 10M chunks, 1,024 dimensions, float32. About how much raw vector memory?
- 10 GB
- ✓ 41 GB
- 82 GB
- 4 GB
Key idea: Size = vectors x dimensions x bytes per number.
Why: 10M x 1,024 x 4 bytes = about 41 GB.
If wrong (10 GB): That forgets the 4 bytes per float32 number.

T2-Q4 (math). The same 10M x 1,024 vectors stored as int8 instead of float32. About how much memory?
- 41 GB
- 20 GB
- ✓ 10 GB
- 5 GB
Key idea: int8 uses 1 byte per number, a quarter of float32.
Why: 10M x 1,024 x 1 byte = about 10 GB.
If wrong (20 GB): That's float16 (2 bytes).

T2-Q5. Which statement about HNSW and IVF is true?
- ✓ HNSW usually gives high recall at low latency but uses more memory
- IVF compares the query with every vector
- HNSW is an exact search
- IVF can't be tuned
Key idea: Every ANN index trades recall, speed and memory.
Why: HNSW keeps a graph in memory. IVF searches only nearby clusters and is tuned with nprobe.

T2-Q6. Spot the flaw: queries now use a new embedding model, but document vectors were made with the old one.
- ✓ Vectors from different models aren't comparable; re-embed the documents
- It just runs a bit slower
- Only the query cache needs clearing
- The LLM will correct the mismatch
Key idea: Queries and documents must share one embedding model.
Why: Each model has its own vector space. Mixing them gives near-random results.

T2-Q7. Your IVF index has low recall@10. Which knob helps most?
- ✓ Increase nprobe to search more clusters (costs latency)
- Lower the embedding dimensions
- Shorten the chunks
- Raise the LLM temperature
Key idea: nprobe is IVF's recall-versus-speed dial.
Why: Searching more clusters finds more true neighbors, at the cost of more comparisons.

---

## Topic 3: Retrieval strategy

### Slides
1. **Dense vs sparse.** Dense (vectors) catches meaning and synonyms. Sparse (BM25 keyword search) catches exact terms: IDs, error codes, acronyms, rare names.
2. **Why hybrid wins.** Run both and merge. Reciprocal Rank Fusion (RRF): each list adds 1 / (k + rank), with k often 60. It merges by rank, so you never need to compare raw scores.
3. **Query rewriting.** Turn chatty follow-ups into standalone queries ("what about contractors?" becomes "PTO policy for contractors"). Fix typos, expand acronyms.
4. **Multi-query expansion.** Generate 3 to 5 versions of the question, search each, merge. Better recall, more latency and cost.
5. **Metadata filtering.** Restrict by product, date range, language or permissions. Filter inside the search, not after it, or you can lose all your top results.

### Questions
T3-Q1. A user searches "ERR_4012 timeout" and dense-only search misses the right doc. Why?
- ✓ Exact rare tokens like error codes aren't captured well by embeddings; add keyword search
- The embedding dimension is too small
- The chunk overlap is too large
- The LLM is too small
Key idea: Keyword search catches exact strings that vectors blur.
Why: Embeddings capture meaning. "ERR_4012" has little meaning, but it is an exact match.

T3-Q2. Which query is dense search better at than keyword search?
- ✓ "how do I get my money back" finding a doc titled "Refund policy"
- "SKU-88213"
- "RFC 7231"
- "ERR_4012"
Key idea: Dense search matches meaning even with no shared words.
Why: "money back" and "refund" share no words but mean the same thing.

T3-Q3 (math). With RRF and k = 60, a document is rank 1 in keyword search and rank 3 in dense search. Its fused score?
- ✓ About 0.032
- About 0.016
- About 1.33
- About 0.5
Key idea: RRF adds 1 / (k + rank) from each list.
Why: 1/61 + 1/63 = 0.0164 + 0.0159 = about 0.032.
If wrong (0.016): That counts only one list.
If wrong (1.33): That forgets k: 1/1 + 1/3.

T3-Q4. Spot the flaw: in a chat, the user's follow-up is "what about contractors?" and retrieval searches just that text.
- ✓ The query lacks context; rewrite it into a standalone query using the conversation
- Contractors should be filtered out
- The chunk size is wrong
- The reranker is missing
Key idea: Rewrite follow-ups into standalone queries before searching.
Why: "what about contractors?" alone matches almost anything.

T3-Q5. What's the main trade-off of multi-query expansion?
- ✓ Better recall, but more latency and cost
- Better precision, but lower recall
- Lower cost, but worse answers
- No trade-off
Key idea: More searches find more, but each one costs time and tokens.
Why: You add an LLM call to write the variants plus several searches to run and merge.

T3-Q6. Spot the flaw: a user asks about 2026 pricing, and the 2023 pricing page ranks first.
- ✓ No date or version filter; filter or boost by date and version metadata
- The embedding model is broken
- The chunks are too small
- The LLM temperature is too high
Key idea: Use metadata to keep results current.
Why: Old and new pricing pages look almost identical to an embedding.

T3-Q7 (math). Multi-query: an LLM rewrite takes 300 ms, then 4 searches of 40 ms each run in parallel, then merging takes 10 ms. How much latency does this add compared with one 40 ms search?
- ✓ About 310 ms
- About 430 ms
- About 120 ms
- No added latency
Key idea: Parallel searches cost the slowest one, not the sum.
Why: 300 + 40 + 10 = 350 ms total, versus 40 ms before, so about 310 ms more.
If wrong (430 ms): That runs the 4 searches one after another.
