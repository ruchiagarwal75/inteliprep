# RAG content: Levels 1 and 2

Answer to your question about drill counts: use the real content below for Levels 1 and 2 (8 drills each). For Levels 3 and 4, add 5 placeholder drills each, marked TODO in code and "[sample]" in the visible text, so a 5-drill session works. Replace them when Level 3 and 4 content arrives.

Move this content into the server-only content file. Keep answers, rubrics and formulas out of the client bundle. This markdown file is the source; do not import it into client code.

## Level 1: Retrieval basics (8 drills)

L1-01 | Spot the flaw (multiple choice)
Design: Documents are split into fixed 8,000-token chunks. Only the top 1 chunk is sent to the LLM.
Options:
A) Chunks this large mix many topics, so the match is weak and the context window fills with noise
B) The documents should be stored in SQL instead
C) The embeddings must be at least 4,096 dimensions
D) The system needs a CDN in front of retrieval
Correct: A
Why: Huge chunks dilute relevance and waste context. Smaller chunks (a few hundred tokens), some overlap, and top-k > 1 work better. Verify with recall@k on a test set.

L1-02 | Spot the flaw (multiple choice)
Design: Users search for exact error codes like ERR_4012 and part numbers. Retrieval is vector search only.
Options:
A) Vector search often misses exact rare tokens like IDs and codes; add keyword search (hybrid)
B) Vector search can't handle more than 1M documents
C) Error codes must be translated into English first
D) The LLM should be fine-tuned on every error code
Correct: A
Why: Embeddings capture meaning, not exact strings. Hybrid retrieval (keyword + vector) catches IDs, codes and names.

L1-03 | Trade-off call (AI graded)
Prompt: Your wiki has long how-to pages. Chunk size: 200 tokens or 1,000 tokens? Make a call and give your reason in 1 to 3 sentences.
Pass if the answer: makes a clear call; names the trade-off (small chunks = precise but lose context, large chunks = more context but diluted match); AND says how to check it (a test set, recall@k, answer quality) or a way to get both (overlap, retrieve small then expand to the parent section).
Fail if: no call, or "it depends" with no mechanism.
Senior answer: "Around 200 to 400 with overlap, then expand hits to their parent section, so the match is precise but the LLM sees full steps. I'd compare both sizes on recall@10 against a labeled question set."

L1-04 | Spot the flaw (multiple choice)
Design: PDFs are parsed to plain text line by line, including tables, then chunked.
Options:
A) Table rows and column headers get separated, so answers about table values are wrong
B) PDFs can't be embedded at all
C) Plain text is too large to store
D) Line-by-line parsing makes retrieval slower than 1 second
Correct: A
Why: Tables lose structure. Use table-aware parsing, keep each table (or row) together with its headers, and test questions about table values.

L1-05 | Pick the probe (AI graded)
Design: Hybrid retrieval (keyword + vector) returns the top 50 merged results. A cross-encoder reranker picks the top 5. The top 5 go to the LLM.
Prompt: Write the one follow-up question you'd ask this candidate.
Pass if the question targets a real failure mode or cost of something in this design, for example: reranker latency or cost at p95; how keyword and vector scores are merged; what happens when the answer isn't in the top 50 (recall); how they know the reranker helps (measurement).
Fail if: generic ("how would you scale it?"), or about a part that isn't in the design.
Senior answer: "How many of your misses are retrieval misses, meaning the right chunk isn't in the top 50 at all? The reranker can't fix that."

L1-06 | Spot the flaw (multiple choice)
Design: The team switched to a new embedding model. New queries are embedded with the new model and searched against document vectors made with the old model.
Options:
A) Vectors from different models aren't comparable, so results become close to random; the corpus must be re-embedded
B) It works, but only 10% slower
C) Only the query cache needs clearing
D) The LLM will correct for the mismatch
Correct: A
Why: Each model has its own vector space. Re-embed everything into a new index, run both indexes during the switch, and cut over after quality checks.

L1-07 | Trade-off call (AI graded)
Prompt: First-token budget is 2 s at p95. Retrieval takes 300 ms. The LLM's first token takes 900 ms. A reranker adds about 250 ms for 50 candidates. Add the reranker or not? Give your reason in 1 to 3 sentences.
Pass if the answer: does the budget math (300 + 250 + 900 = 1,450 ms, under 2,000 ms with about 550 ms to spare); makes a call; AND ties it to measuring the quality gain, or names a way to cut cost (rerank fewer candidates).
Fail if: no math, or a call with no reason.
Senior answer: "Yes. 1.45 s fits the 2 s budget with about 0.5 s of room. I'd keep it only if it improves answer quality on our eval set, and I'd rerank 30 instead of 50 if p95 gets tight."

L1-08 | Spot the flaw (multiple choice)
Design: When retrieval finds nothing relevant (all scores are low), the assistant answers from the model's own knowledge anyway.
Options:
A) It will make up answers with no sources; it should say it couldn't find a source, or ask a clarifying question
B) It should retry the same search 10 times
C) It should return the 5 lowest-scoring chunks
D) This is fine because the model knows the company
Correct: A
Why: An enterprise assistant must cite sources. Set a relevance threshold and abstain or ask for clarification below it.

Shuffle the multiple-choice options per attempt so the correct answer is not always A.

## Level 2: Scale math (8 math templates)

Rules for all math drills: the server picks the numbers from the ranges, computes the answer, and accepts answers within 15%. Integer answers (like node counts) must be exact. Show the formula and the right value after answering.

L2-01 | Raw vector storage
Prompt: {docs} documents, about {chunks} chunks each, {dims}-dimension embeddings stored as 4-byte floats. How much raw vector storage, before index overhead?
Ranges: docs 1M to 20M (step 1M), chunks 5 to 20, dims one of 384, 768, 1024, 1536
Formula: docs x chunks x dims x 4 bytes
Unit: GB (1 GB = 10^9 bytes)
Example: 5M x 10 x 768 x 4 = 153.6 GB

L2-02 | Daily re-embedding volume
Prompt: {docs} documents, {pct}% change every day, about {chunks} chunks each. How many chunks need re-embedding per day?
Ranges: docs 1M to 20M, pct 1 to 5, chunks 5 to 20
Formula: docs x pct/100 x chunks
Unit: chunks per day
Example: 5M x 2% x 10 = 1M chunks per day

L2-03 | Peak query rate
Prompt: {q} questions per day. Peak traffic is {k}x the average. What's the peak rate?
Ranges: q 10K to 2M, k 2 to 5
Formula: q / 86,400 x k
Unit: questions per second
Example: 100K / 86,400 x 3 = 3.5 per second

L2-04 | LLM tokens per day
Prompt: {q} questions per day. Each uses about {tin} input tokens and {tout} output tokens. How many total tokens per day?
Ranges: q 10K to 2M, tin 1,000 to 8,000 (step 500), tout 200 to 1,000 (step 100)
Formula: q x (tin + tout)
Unit: millions of tokens per day
Example: 100K x 4,500 = 450M tokens per day

L2-05 | Cost per question
Prompt: Each question uses {tin} input tokens and {tout} output tokens. Input costs ${pin} per 1M tokens, output costs ${pout} per 1M tokens. What's the cost per question?
Ranges: tin 1,000 to 8,000, tout 200 to 1,000, pin 0.5 to 5 (step 0.5), pout 2 to 20 (step 1)
Formula: tin x pin/1M + tout x pout/1M
Unit: cents per question
Example: 4,000 x $1/1M + 500 x $4/1M = $0.006 = 0.6 cents

L2-06 | Monthly LLM cost
Prompt: {q} questions per day at {c} cents per question. What's the monthly cost (30 days)?
Ranges: q 10K to 2M, c 0.2 to 5 (step 0.1)
Formula: q x 30 x c / 100
Unit: dollars per month
Example: 100K x 30 x 0.6 cents = $18,000 per month

L2-07 | Full re-embedding time
Prompt: You switch embedding models and must re-embed {n} chunks. Each GPU embeds about {t} chunks per second. You have {g} GPUs. How long does it take?
Ranges: n 10M to 500M, t 500 to 5,000 (step 500), g 1 to 16
Formula: n / (t x g) / 3,600
Unit: hours
Example: 50M / (2,000 x 4) / 3,600 = 1.7 hours

L2-08 | Index nodes needed
Prompt: Raw vectors take {raw} GB. The index adds {ov}x overhead. Each node has {mem} GB of memory and you can use 75% of it. How many nodes do you need?
Ranges: raw 20 to 2,000, ov one of 1.2, 1.5, 2.0, mem one of 32, 64, 128, 256
Formula: ceil(raw x ov / (mem x 0.75))
Unit: nodes (exact integer)
Example: 153.6 x 1.5 = 230.4 GB; 64 x 0.75 = 48 GB per node; 230.4 / 48 = 4.8, so 5 nodes

Note: the bank will grow to 15 to 20 drills per level later. With random numbers, the 8 math templates already give plenty of variety for Level 2.
