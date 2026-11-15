# Topic 4: Re-ranking, v1 (new topic)

Slide bodies support short paragraphs, bullet lists and numbered lists. Keep the wording as written.
Diagrams: clean vector SVG, Inter, theme colors, square boxes, clear arrows. Landscape at desktop (max 200 px tall), portrait below 600 px wide. Gold marks the thing to notice.

## Slides

### S1. Why re-rank?
First-stage search (dense, keyword or hybrid) is built for speed across millions of chunks. It's good at finding candidates and weaker at ordering them.

A re-ranker reads the query and each candidate together, then scores how well that chunk answers the question. You run it only on the top 50 to 100.

The result: the right chunk moves from 37th into the top 5, and the LLM gets less noise.

### S2. Bi-encoder vs cross-encoder
- **Bi-encoder:** the query and the chunk are embedded separately, then the vectors are compared. Fast, precomputed and able to search millions.
- **Cross-encoder:** the query and the chunk go into the model together, and it outputs one relevance score. It sees word-level details like "not covered" or "before 2024", so it's much more accurate.

The query and chunk must be processed together, so each pair needs inference. Batch the pairs to reduce overhead. That is why cross-encoders re-rank a shortlist instead of the full corpus.
Diagram: two panels. Left, "Bi-encoder": Query into Encoder, giving a vector; Chunk into Encoder, giving a vector; both vectors into "Cosine". Right, "Cross-encoder": one box "Query + Chunk" into a single gold "Encoder", then "Score 0.91".

#### Deep dive: Count pair computations, not network calls
A cross-encoder must jointly process each query-and-chunk pair. For 80 candidates, that is 80 pair scores. It does not have to mean 80 separate HTTP requests: a service can accept the pairs in one request and run them in batches.

Longer chunks increase the work, and the batch may need splitting to fit memory. Compare end-to-end re-ranking time, including queueing, tokenization and network overhead.

The first-stage retriever still matters. A perfectly ordered shortlist cannot recover a passage that never entered it. This is why capacity and retrieval recall belong in the explanation before selecting a re-ranker.

Read more: [Cross-encoder pair scoring and batching](https://www.sbert.net/examples/cross_encoder/applications/README.html)

### S3. The two-stage pipeline
1. **Retrieve:** hybrid search returns a shortlist, such as the top 100. Measure its latency on your corpus.
2. **Re-rank:** a cross-encoder scores those 100 and sorts them.
3. **Select:** keep the best 5 to 10 for the prompt.

Retrieval is tuned for recall: is the right chunk somewhere in the top 100? Re-ranking is tuned for precision at the top: is it in the top 5?
Diagram: an illustrative timing example, not a benchmark, in a left-to-right row: "1M chunks", then "Retrieve" (label "about 30 ms"), then "100 candidates", then a gold "Re-rank" (label "about 80 ms"), then "Top 5", then "LLM".

### S4. Kinds of re-rankers
- **Cross-encoder models:** small open models trained for relevance, such as the BGE or MS MARCO re-rankers. You host them.
- **Hosted re-rank APIs:** send the query and candidates, get scores back (Cohere and Voyage offer these). Easy, but adds a network hop and a price per call.
- **LLM as re-ranker:** ask an LLM to sort the candidates. Flexible, but the slowest and most expensive.
- **Late interaction (ColBERT):** one vector per token, matched token by token. It trades a larger per-token index for richer matching. Measure its quality, latency and storage on your workload.

### S5. Latency and cost
Re-ranking cost grows with the number of candidates times the tokens in each pair.
- 100 candidates of about 300 tokens each is about 30,000 tokens to score per question.
- On a GPU, a small re-ranker scores 100 pairs in one batch in tens of milliseconds. A large model, or a CPU, can take hundreds.

Knobs: fewer candidates, shorter chunks, a smaller model, batching all pairs in one call, and caching repeated queries.

Set the budget first, for example "re-ranking must finish in 100 ms at p95", then tune to fit it.

### S6. How many candidates?
- **Too few (top 10):** the right chunk at 37th never gets a chance.
- **Too many (top 1,000):** latency and cost explode for a tiny gain.

Pick N with data. First-stage recall@N is the ceiling for the re-ranker. If recall@50 is 95% and recall@100 is 96%, re-rank 50.
Diagram: a line chart. X axis "Candidates re-ranked (N)" with ticks 10, 50, 100, 200. Y axis "Recall@N". The line rises steeply, then flattens. The bend at N = 50 is marked with a gold dot labeled "Good N".

#### Deep dive: Read the quality curve with the latency budget
In an illustrative test, retrieving 40 candidates finds evidence for 180 of 200 answerable questions. Retrieving 80 finds evidence for 188. The extra candidates recover eight questions, but double the number of pairs sent to re-ranking.

Check whether those recovered cases matter, whether the right passage survives into the final context, and whether p95 still meets the budget. An overall gain can hide a regression for a region or document format.

Choose a candidate count from that trade-off, not because "top 100" is conventional. If recall remains low, fix candidate retrieval before buying a larger re-ranker.

### S7. Scores and "no good answer"
Re-ranker scores are usually more meaningful than raw vector similarity, so you can act on them:
- If even the best chunk scores low, say "I couldn't find that" instead of letting the LLM guess.
- Drop weak chunks below a cutoff to keep the prompt small.

Tune the cutoff on your own question set, and re-tune it when you change re-ranker models. Scores shift between models.

#### Deep dive: A relevance threshold needs no-answer examples
Suppose an irrelevant passage receives a re-ranker score of 0.81. Calling that an 81% chance of a correct answer would be a mistake unless you calibrated that interpretation.

Collect answerable and unanswerable questions. For each candidate cutoff, count supported answers you lose and unsupported answers you still allow. Choose a policy with the product's error costs in mind, then check it again when the model or corpus changes.

An uncertain match can lead to a clarification or a useful refusal. A permission failure must lead to denial. They are different reasons for not answering and should have different diagnostics.

### S8. Diversity: avoid five copies
If the top 5 are near-duplicates, such as the same policy copied into five wikis, the LLM gets one fact five times and misses the rest.
- **MMR (Maximal Marginal Relevance):** pick each next result by its relevance minus its similarity to the results already picked.
- **Cap per document:** keep at most 1 or 2 chunks from each source document.
- **Dedupe at ingestion** first (Topic 1), so fewer copies reach search at all.
Diagram: two columns of 5 stacked boxes. Left, "Without MMR": five boxes all labeled "Refund policy (copy)". Right, "With MMR", in gold: "Refund policy", "Refund FAQ", "Billing ticket", "Exceptions page", "Contractor policy".

#### Deep dive: Diversity must preserve the evidence needed to answer
The top five chunks all repeat the employee allowance. A contractor exception is sixth. Removing duplicates can make room for that exception and produce a better answer.

But a rigid one-chunk-per-document cap can also remove evidence. One policy may need its eligibility paragraph and its exceptions paragraph together. Deduplicate copies, then preserve distinct supporting facts or expand a matching parent section.

Measure whether the final context contains all required evidence for multi-part questions. A varied list of sources is not useful if it drops the one condition that changes the answer.

### S9. Business rules on top
Relevance isn't the only signal. The final order often mixes in:
- **Freshness:** newer versions rank higher.
- **Authority:** the official handbook beats a chat thread.
- **Personalization:** the user's team, region or product.
- **Hard rules:** never show drafts; always include the security policy for security questions.

Apply these as a small, explainable layer after the re-ranker, for example: final score = re-rank score + 0.1 x freshness. Keep it simple enough to debug.

### S10. Fine-tuning a re-ranker
Off-the-shelf re-rankers learned from web search data. Your domain (legal clauses, internal jargon, code) may look very different.
- Collect pairs of (query, right chunk) from clicks, thumbs-up votes or labeled evals.
- Add **hard negatives:** chunks that look similar but are wrong for the query.
- Fine-tune a small cross-encoder on a few thousand pairs.
- Compare it with the base model on held-out questions before shipping.

Hard negatives matter most. They teach the fine distinctions that first-stage search can't see.

### S11. Measuring re-ranking
Compare the top of the list before and after re-ranking, on the same questions:
- **Hit rate@5:** how often a right chunk is in the top 5.
- **MRR:** how high the first right chunk ranks, on average.
- **nDCG@10:** rewards putting the most relevant chunks first when some are more relevant than others.
- **Latency p95 and cost** per question.

A re-ranker that adds 150 ms but moves hit rate@5 from 82% to 83% usually isn't worth it.

### S12. Interview checklist
When asked "How would you improve answer quality without changing the LLM?", cover:
- Retrieve wide (top 50 to 100) with hybrid search
- Re-rank with a cross-encoder sized to a latency budget
- Pick N from the recall@N curve
- Add diversity (MMR) and simple business rules
- Measure hit rate@5 and MRR before and after

Explaining why a cross-encoder can't score the whole corpus is a strong Senior signal.

## Questions

T4-Q1 · Why re-rank
Slide: S1
Why add a re-ranker after hybrid search?
- ✓ It reads the query and chunk together, so it orders the top results better
- It finds chunks the first search never returned, which raises overall recall
- It lets you skip first-stage retrieval entirely, which makes answers faster
- It shortens each chunk so that more of them fit into the prompt
Key idea: Retrieval finds candidates; re-ranking orders them.
Why: A cross-encoder sees the query and chunk together, so it judges relevance more precisely than vector similarity.
If wrong (It finds chunks the first search never returned, which raises overall recall): It can only reorder what retrieval returned. Missing chunks stay missing.
If wrong (It lets you skip first-stage retrieval entirely, which makes answers faster): A re-ranker is too slow to score the whole corpus. It needs retrieval's shortlist.
If wrong (It shortens each chunk so that more of them fit into the prompt): Re-ranking changes the order, not the chunk length. Compression is a separate step (Topic 5).

T4-Q2 · Why not everything
Slide: S2
Why can't you run a cross-encoder over all 10M chunks for every question?
- ✓ It runs once per query-chunk pair, so nothing can be precomputed
- Cross-encoders only accept queries shorter than about 10 words
- Its scores can't be compared, so millions of them give a random order
- A vector index can't store cross-encoder outputs at that kind of scale
Key idea: Cross-encoders are accurate because they read pairs, and slow for the same reason.
Why: 10M chunks would mean 10M model calls per question. Bi-encoders avoid this by precomputing document vectors.
If wrong (Cross-encoders only accept queries shorter than about 10 words): Query length isn't the limit. The cost is one model call per pair.
If wrong (Its scores can't be compared, so millions of them give a random order): Scores for one query compare fine. The problem is 10M model calls.
If wrong (A vector index can't store cross-encoder outputs at that kind of scale): A cross-encoder outputs a score per pair, not a stored vector. That's why nothing is precomputed.

T4-Q3 · Batch time (math)
Slide: S5
A re-ranker scores 20 pairs per batch, and each batch takes 15 ms. Batches run one after another. How long does it take to re-rank 100 candidates?
- ✓ 75 ms
- 15 ms
- 300 ms
- 1,500 ms
Key idea: Batches = candidates / batch size; time = batches x time per batch.
Why: 100 / 20 = 5 batches, and 5 x 15 ms = 75 ms.
If wrong (15 ms): That's one batch. 100 candidates need 5 batches.
If wrong (300 ms): That multiplies the batch size by the batch time. Divide 100 by 20 first.
If wrong (1,500 ms): That treats every candidate as its own batch.

T4-Q4 · Pick N
Slide: S6
First-stage recall@50 is 95%, and recall@200 is 96%. The re-ranker is your slowest step. How many candidates should it score?
- ✓ About 50, since 200 means 4x the work for 1 point of recall
- About 200, because every point of recall is always worth it
- About 5, so the re-ranker barely runs and stays as fast as possible
- All of them, so the first-stage ranking no longer matters at all
Key idea: The recall@N curve tells you where more candidates stop paying off.
Why: Going from 50 to 200 quadruples re-ranking cost and latency for a 1-point recall gain.
If wrong (About 200, because every point of recall is always worth it): That's 4x the latency and cost for 1 point. Usually not worth it.
If wrong (About 5, so the re-ranker barely runs and stays as fast as possible): Then it can't rescue a chunk ranked 6th to 50th, and recall@5 is much lower.
If wrong (All of them, so the first-stage ranking no longer matters at all): A cross-encoder over the whole index is far too slow.

T4-Q5 · Five copies
Slide: S8
Spot the flaw: after re-ranking, the top 5 chunks are the same refund policy copied from five wikis.
- ✓ No diversity step; use MMR or keep one chunk per document
- The re-ranker is broken, since it should never score copies the same
- Five is too few; send the top 20 so that other documents get in too
- No flaw: the LLM merges the copies, so it costs nothing extra
Key idea: Relevance alone can fill the top results with duplicates.
Why: MMR or a per-document cap makes room for different, useful sources.
If wrong (The re-ranker is broken, since it should never score copies the same): Copies really are equally relevant. Diversity needs its own step.
If wrong (Five is too few; send the top 20 so that other documents get in too): That adds tokens and may still be mostly copies. Fix the selection, not the size.
If wrong (No flaw: the LLM merges the copies, so it costs nothing extra): You pay for five copies of one fact and lose room for other sources.

T4-Q6 · Low scores
Slide: S7
Even the best re-ranked chunk scores very low for a question. What should the system do?
- ✓ Say it couldn't find an answer instead of letting the LLM guess
- Send the low-scoring chunks anyway, since the LLM will filter out the bad ones
- Retry the same search until a higher score comes back
- Raise the LLM temperature so it can be more creative
Key idea: A low top score is a signal to admit "no good answer".
Why: Weak context invites confident wrong answers. Saying so, or asking a clarifying question, is safer.
If wrong (Send the low-scoring chunks anyway, since the LLM will filter out the bad ones): Weak context invites confident wrong answers.
If wrong (Retry the same search until a higher score comes back): The same search returns the same results. Rewrite the query or admit there's no answer.
If wrong (Raise the LLM temperature so it can be more creative): More randomness on weak context means more made-up answers.

T4-Q7 · Cross-encoders
Slide: S2
Which statement about cross-encoders is true?
- ✓ They read the query and chunk together, so they catch details like negation
- They embed each chunk once at indexing time, so they're as fast as vector search
- They replace keyword search, since they also match exact error codes on their own
- They need no training data at all, because they work from hand-written rules
Key idea: Reading the pair together is what makes cross-encoders precise.
Why: Seeing both texts at once lets the model notice words like "not" or "except" that vectors blur.
If wrong (They embed each chunk once at indexing time, so they're as fast as vector search): That's a bi-encoder. Cross-encoders run per pair, at query time.
If wrong (They replace keyword search, since they also match exact error codes on their own): They re-score candidates; they don't search the index. Keep hybrid retrieval.
If wrong (They need no training data at all, because they work from hand-written rules): They're trained models, usually on large relevance datasets.

T4-Q8 · LLM re-ranker tokens (math)
Slide: S4
An LLM re-ranks 50 candidates of 300 tokens each, plus a 200-token instruction, once per question. At 1,000 questions per day, about how many input tokens is that per day?
- ✓ About 15M
- About 1.5M
- About 300K
- About 150M
Key idea: LLM re-ranking cost scales with candidates x chunk length x traffic.
Why: 50 x 300 + 200 = 15,200 tokens per question, x 1,000 = about 15 million.
If wrong (About 1.5M): Check the zeros: 15,200 x 1,000 is about 15 million.
If wrong (About 300K): That counts one candidate per question. All 50 go into the prompt.
If wrong (About 150M): That's 10x too many. 50 x 300 is 15,000 per question.

T4-Q9 · Hard negatives
Slide: S10
Your documents have many near-identical clauses, and the base re-ranker mixes them up. Which training data helps most?
- ✓ Hard negatives: similar-looking chunks that are wrong for the query
- Random negatives: chunks picked at random from the whole index
- More positive pairs only, with no negative examples at all
- General web search data, since it's much larger than your set
Key idea: Hard negatives teach the fine distinctions.
Why: The model already rejects obviously wrong chunks. It needs practice on close-but-wrong ones.
If wrong (Random negatives: chunks picked at random from the whole index): Random chunks are easy to reject. They don't teach the fine distinction.
If wrong (More positive pairs only, with no negative examples at all): Without negatives, the model can't learn what "close but wrong" looks like.
If wrong (General web search data, since it's much larger than your set): That's what the base model already learned. Your clauses are the gap.

T4-Q10 · Worth it?
Slide: S11
For a chat product with a tight latency budget, a new re-ranker adds 150 ms at p95 and moves hit rate@5 from 82% to 83%. What's the best call?
- ✓ Probably skip it; 1 point isn't worth 150 ms on every question
- Ship it, since any gain in accuracy justifies the extra latency
- Ship it, and drop first-stage retrieval to win the time back
- Ship it, and trust the vendor's benchmark from now on
Key idea: Every quality gain has a latency and cost price. Weigh them.
Why: Every user pays the 150 ms. A 1-point gain rarely justifies that in a latency-sensitive product.
If wrong (Ship it, since any gain in accuracy justifies the extra latency): Latency is a cost every user pays. Weigh it against the gain.
If wrong (Ship it, and drop first-stage retrieval to win the time back): The re-ranker needs retrieval's shortlist. It can't search alone.
If wrong (Ship it, and trust the vendor's benchmark from now on): Public benchmarks don't match your data. Measure on your own questions.
