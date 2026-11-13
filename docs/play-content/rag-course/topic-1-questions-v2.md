# Topic 1: Ingestion and chunking, questions v2 (replaces the Topic 1 options and If wrong lines)

Prompts, correct answers, key ideas and Why lines stay the same unless shown differently here. Slides stay as in topic-1-slides-v2.md.

T1-Q1 · Big chunks
Slide: S6
Why do very large chunks hurt retrieval?
- ✓ One embedding averages many topics, so the match is diluted
- Vector databases reject chunks over a few hundred tokens
- Bigger chunks need more embedding dimensions to fit
- The LLM can only read chunks shorter than 1,000 tokens
Key idea: One vector per chunk. The more ideas in a chunk, the blurrier its vector.
Why: Large chunks mix topics, so similarity to any one question drops, and they waste context tokens.
If wrong (Vector databases reject chunks over a few hundred tokens): Vector stores hold fixed-size vectors. Chunk length doesn't change that.
If wrong (Bigger chunks need more embedding dimensions to fit): The model's vector size is fixed. A long chunk gets the same number of dimensions.
If wrong (The LLM can only read chunks shorter than 1,000 tokens): LLMs read far more than that. The real issue is the blurry vector.

T1-Q2 · Cut sentences
Slide: S6
You split every 300 tokens with no overlap, and a key sentence is cut in half. Best fix?
- ✓ Add 10 to 20% overlap, or split on sentence boundaries
- Switch to an embedding model with more dimensions
- Double the chunk size to 600 tokens so cuts happen less often
- Strip stop words so each sentence fits inside one chunk
Key idea: Overlap and sentence-aware splits keep ideas whole.
Why: Neither half of a split sentence carries the full meaning. Overlap repeats the boundary text in both chunks.
If wrong (Switch to an embedding model with more dimensions): More dimensions can't rebuild a sentence that was cut in half.
If wrong (Double the chunk size to 600 tokens so cuts happen less often): Bigger chunks still cut sentences somewhere, and they blur the vector.
If wrong (Strip stop words so each sentence fits inside one chunk): Removing words damages meaning and doesn't stop the cut.

T1-Q3 · Split tables
Slide: S8
Spot the flaw: Markdown docs are cut every 500 tokens, splitting a pricing table in the middle.
- ✓ Rows lose their header row, so answers about the table come out wrong
- 500 tokens is too small a chunk size for Markdown files
- Embedding models can't read Markdown table syntax, so tables are ignored
- The table should be removed, since tables don't embed well
Key idea: Keep tables with their headers.
Why: A row like "Pro | 49 | 10" means nothing without "Plan | Price | Seats".
If wrong (500 tokens is too small a chunk size for Markdown files): Size isn't the problem. Any fixed cut can split a table.
If wrong (Embedding models can't read Markdown table syntax, so tables are ignored): They can read it. The trouble is the rows that lost their header.
If wrong (The table should be removed, since tables don't embed well): Tables hold key facts. Keep them with headers, or turn rows into sentences.

T1-Q4 · Citation metadata
Slide: S10
Which metadata lets the answer show "Source: HR Handbook, updated Mar 2026"?
- ✓ Title, source and updated timestamp
- The chunk's embedding vector
- The chunk's overlap and token count
- The similarity score from the search
Key idea: Citations and freshness come from metadata, not from the vector.
Why: The vector is only for matching. Display info must be stored alongside it.
If wrong (The chunk's embedding vector): A vector is just numbers for matching. It can't be turned back into a title.
If wrong (The chunk's overlap and token count): Those describe chunking, not where the text came from.
If wrong (The similarity score from the search): The score says how well it matched, not where it came from.

T1-Q5 · Chunk count (math)
Slide: S6
2M documents, about 4,000 tokens each, 500-token chunks with 100-token overlap. About how many chunks?
- ✓ 20M
- 16M
- 2M
- 200M
Key idea: Chunks per doc is roughly doc tokens divided by (chunk size minus overlap).
Why: Each new chunk moves forward 400 tokens, so 4,000 / 400 = 10 chunks per doc, and 2M x 10 = 20M.
If wrong (16M): That forgets the overlap: 4,000 / 500 = 8.
If wrong (2M): That's one chunk per document.
If wrong (200M): That's 100 chunks per document. Each chunk adds 400 new tokens, so it's 10.

T1-Q6 · Stale chunks
Slide: S11
Spot the flaw: when a document is edited, its new chunks are added but its old chunks stay in the index.
- ✓ Old text still gets retrieved; replace a document's chunks by its ID
- The embedding model must be retrained after every document edit to stay accurate
- Edits should be ignored until a monthly full re-index
- Overlap between old and new chunks causes duplicate vectors
Key idea: Updates must replace, not just add.
Why: Old chunks still match questions and return stale or conflicting answers.
If wrong (The embedding model must be retrained after every document edit to stay accurate): The model is fine. The index still holds the old chunks.
If wrong (Edits should be ignored until a monthly full re-index): That serves stale answers for weeks. Replace chunks on each edit.
If wrong (Overlap between old and new chunks causes duplicate vectors): Overlap isn't the cause. The old chunks were never removed.

T1-Q7 · Changed chunks (math)
Slide: S11
100K documents are edited per day, 10 chunks each, and about 2 chunks actually change per edit. With chunk hashes, how many chunks do you re-embed daily?
- ✓ 200K
- 1M
- 100K
- 2M
Key idea: Hash chunks and re-embed only what changed.
Why: 100K edits x 2 changed chunks = 200K.
If wrong (1M): That re-embeds every chunk of every edited document.
If wrong (100K): That's one chunk per edit. About 2 change each time.
If wrong (2M): That's 20 chunks per edit. Only about 2 change.
