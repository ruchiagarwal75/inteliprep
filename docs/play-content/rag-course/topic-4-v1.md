# Topic 4: Re-ranking, v1 (new topic)

Slide bodies support short paragraphs, bullet lists and numbered lists. Keep the wording as written.
Diagrams: clean vector SVG, Inter, theme colors, square boxes, clear arrows. Landscape at desktop (max 200 px tall), portrait below 600 px wide. Gold marks the thing to notice.

## Slides

### S1. Why re-rank?
First-stage search (dense, keyword or hybrid) is built for speed across millions of chunks. It's good at finding candidates and weaker at ordering them.

A re-ranker reads the query and each candidate together, then scores how well that chunk answers the question. You run it only on the top 50 to 100.

The result: the right chunk moves from 37th into the top 5, and the LLM gets less noise.

#### Deep dive: Use the shortlist to distinguish related text from supporting evidence
Retrieval finds plausible candidates quickly. Re-ranking compares those candidates more carefully with the question. It is useful when several passages share the topic but only one contains the needed rule.

For "Can a contractor claim a chair?", candidates might include employee equipment allowances, office furniture ordering and the contractor furniture exclusion. All are related. The exclusion is the passage that directly supports the answer.

The reranker scores query-passage pairs and reorders a bounded shortlist. It cannot find evidence that first-stage retrieval omitted. Keep retrieval recall and reranker ranking quality as separate measurements.

Compare the top results before and after reranking on labeled queries. Include exact identifiers, negation and exceptions, not just easy paraphrases. Then test whether the final answers actually improve when the new order reaches the context builder.

Reranking adds compute and delay. A simple system may not need a learned reranker if lexical or hybrid search already places the right passages reliably. Add it to solve a measured ranking problem, with a budget and a fallback if the dependency becomes slow.

### S2. Bi-encoder vs cross-encoder
- **Bi-encoder:** the query and the chunk are embedded separately, then the vectors are compared. Fast, precomputed and able to search millions.
- **Cross-encoder:** the query and the chunk go into the model together, and it outputs one relevance score. It sees word-level details like "not covered" or "before 2024", which can improve ranking; verify the gain on your queries.

The query and chunk must be processed together, so each pair needs inference. Batch the pairs to reduce overhead. That is why cross-encoders re-rank a shortlist instead of the full corpus.
Diagram: two panels. Left, "Bi-encoder": Query into Encoder, giving a vector; Chunk into Encoder, giving a vector; both vectors into "Cosine". Right, "Cross-encoder": one box "Query + Chunk" into a single gold "Encoder", then "Score 0.91".

#### Deep dive: Independent representations versus joint attention
A bi-encoder embeds the query and passage independently. Search compares the vectors. That allows document embeddings to be prepared once, but the passage representation cannot adapt to a particular question.

A **cross-encoder** processes the query and passage together. Token interactions can help distinguish "contractors may claim equipment" from "contractors may not claim furniture" when the question is specifically about a chair.

For 50 retrieved passages, the cross-encoder evaluates 50 query-passage pairs, often in batches. The cost depends on input lengths, model size, hardware and concurrency. "One batch" does not mean zero cost or identical latency for every load.

Joint scoring can improve ranking, but the benefit is empirical. Test it against the bi-encoder ordering on your actual queries and language slices. Long passages may be truncated, and a scorer can still favor superficial wording.

Keep access checks ahead of any external scorer. Sending forbidden candidate passages to a reranking service is already a disclosure even if they never enter the final prompt. Reranking is part of the data-processing boundary, not merely a harmless sorting step.

Read more: [Cross-encoder pair scoring and batching](https://www.sbert.net/examples/cross_encoder/applications/README.html)

### S3. The two-stage pipeline
1. **Retrieve:** hybrid search returns a shortlist, such as the top 100. Measure its latency on your corpus.
2. **Re-rank:** a cross-encoder scores those 100 and sorts them.
3. **Select:** keep the best 5 to 10 for the prompt.

Retrieval is tuned for recall: is the right chunk somewhere in the top 100? Re-ranking is tuned for precision at the top: is it in the top 5?
Diagram: an illustrative timing example, not a benchmark, in a left-to-right row: "1M chunks", then "Retrieve" (label "about 30 ms"), then "100 candidates", then a gold "Re-rank" (label "about 80 ms"), then "Top 5", then "LLM".

#### Deep dive: Set a budget at each stage and preserve the decisive passage
A two-stage pipeline first retrieves broadly and then ranks a smaller set carefully. Context assembly selects a final evidence set under a token budget. Each stage can lose useful evidence.

An illustrative pipeline might retrieve 60 unique candidates, rerank them and keep enough passages to fit 4,000 evidence tokens. These numbers are choices to test, not universal defaults.

Trace a supporting passage through the funnel. If it ranks 80th in first-stage search, a 60-candidate reranker never sees it. If it ranks first after reranking but is too long, a naive token cutoff may still drop the sentence that matters.

Track evidence recall before and after each cut. Also track duplicate passages, source coverage and the amount of selected text. A multi-part question may need two complementary sources rather than the top three passages from one document.

Bound work per request and preserve a safe fallback. If reranking times out, using the original permitted ranking may be acceptable when tested. It is not acceptable to remove permission filters to meet a latency target.

### S4. Kinds of re-rankers
- **Cross-encoder models:** small open models trained for relevance, such as the BGE or MS MARCO re-rankers. You host them.
- **Hosted re-rank APIs:** send the query and candidates, get scores back (Cohere and Voyage offer these). Easy, but adds a network hop and a price per call.
- **LLM as re-ranker:** ask an LLM to sort the candidates. Flexible, but the slowest and most expensive.
- **Late interaction (ColBERT):** one vector per token, matched token by token. It trades a larger per-token index for richer matching. Measure its quality, latency and storage on your workload.

#### Deep dive: Compare scoring mechanisms rather than model names
A lexical reranker can emphasize exact terms or approved metadata. A cross-encoder scores joint query-passage inputs. A generative model can judge relevance with instructions, but usually has a different latency and output-validation burden.

Some systems use **late interaction**: documents retain several token-level vectors, and query tokens match against them at search time. This preserves finer interactions than one vector per passage while increasing storage and search work.

Choose based on the error you need to fix. Exact policy codes may benefit from lexical signals. Fine distinctions about who qualifies may benefit from joint semantic scoring. Neither approach automatically understands source authority or access rights.

Build a small comparison using the same candidate lists and evidence labels. Measure ranking quality, latency under concurrency and total serving cost. Keep inputs and model versions fixed so the result is reproducible.

If a model emits relevance explanations or structured scores, validate the output. Those explanations are diagnostic text, not evidence that its judgment is correct. Inspect hard negatives where the passage looks related but answers a different question.

### S5. Latency and cost
Re-ranking cost grows with the number of candidates times the tokens in each pair.
- 100 candidates of about 300 tokens each is about 30,000 tokens to score per question.
- Measure actual batch latency on your hardware under concurrency. Model size, passage length and queueing affect the result.

Knobs: fewer candidates, shorter chunks, a smaller model, batching all pairs in one call, and caching repeated queries.

Set the budget first, for example "re-ranking must finish in 100 ms at p95", then tune to fit it.

#### Deep dive: Budget input lengths, queueing and inference together
Reranking latency includes waiting in a queue, preparing query-passage pairs, running the scorer and returning results. Measuring only one isolated model call can miss the tail delays users experience at peak load.

Suppose your illustrative full-answer budget is two seconds and you reserve 150 milliseconds for reranking. That reservation must include queueing and network time. A scorer taking 100 milliseconds alone may exceed it under concurrency.

Long passages increase the work and may exceed the model's input limit. Truncation can remove exceptions. Batching improves throughput in many implementations, but waiting to fill a batch can add delay for individual requests.

Measure p50 and p95 latency with realistic candidate counts, lengths and arrival rates. Compare a smaller shortlist, shorter well-formed chunks or a lighter scorer. Hardware choice should follow the measured workload, not a blanket rule that every reranker needs a GPU.

Set a deadline and define what happens when it is missed. Return a tested lower-cost ranking or a clear temporary failure. Avoid unbounded retries that consume the entire request budget.

### S6. How many candidates?
- **Too few (top 10):** the right chunk at 37th never gets a chance.
- **Too many (top 1,000):** latency and cost explode for a tiny gain.

Pick N with data. First-stage recall@N is the ceiling for the re-ranker. If recall@50 is 95% and recall@100 is 96%, compare the extra recall with latency, cost and critical query slices.
Diagram: a line chart. X axis "Candidates re-ranked (N)" with ticks 10, 50, 100, 200. Y axis "Recall@N". The line rises steeply, then flattens. The bend at N = 50 is marked with a gold dot labeled "Good N".

#### Deep dive: Find the useful part of the recall curve
Increasing the candidate count gives a reranker more chances to see the right evidence. It also increases compute. The useful choice depends on where additional candidates stop improving the cases you care about.

Plot first-stage evidence recall and final answer quality for several shortlist sizes using the same questions. Add latency and cost to the comparison. A gain from 20 to 50 candidates may be valuable; a tiny average gain from 50 to 200 may hide expensive tail latency.

Inspect slices rather than choosing from one aggregate number. A small overall gain can matter if it recovers critical permission or policy exceptions. Conversely, extra candidates may add mostly duplicate passages from the same document.

The final prompt budget is a separate decision. Reranking 100 candidates does not require sending all 100 to generation. Select supporting, complementary passages and preserve needed context around them.

Choose a configuration that meets the task's quality and service goals. There is no universal candidate count or automatic rule that a one-point recall improvement is too small to matter.

### S7. Scores and "no good answer"
Re-ranker scores are usually more meaningful than raw vector similarity, so you can act on them:
- If even the best chunk scores low, say "I couldn't find that" instead of letting the LLM guess.
- Drop weak chunks below a cutoff to keep the prompt small.

Tune the cutoff on your own question set, and re-tune it when you change re-ranker models. Scores shift between models.

#### Deep dive: A ranking score is not a reliable yes-or-no answer threshold
A reranker usually learns to order candidates. Its raw score may not be calibrated as the probability that a passage supports an answer. A highest score exists even when every candidate is irrelevant.

Build examples with no answer in the corpus, as well as partially answerable and fully answerable questions. Label whether the selected passages contain enough evidence. Then evaluate any threshold on those labels.

For instance, "Who approved the unreleased policy?" may retrieve related policy drafts without an approval record. A plausible top passage is not permission to invent an approver. The response can say it could not find enough supporting information.

Thresholds depend on the model, corpus and candidate distribution. Recheck them after an embedding or reranker change. If you combine scores from several sources, do not assume the old numeric cutoff retains its meaning.

Consider a second support check after context assembly, because a good candidate may lose decisive text during truncation. A safe no-answer behavior should be based on available evidence and access rules, not only on whether one ranking score exceeds a constant.

### S8. Diversity: avoid five copies
If the top 5 are near-duplicates, such as the same policy copied into five wikis, the LLM gets one fact five times and misses the rest.
- **MMR (Maximal Marginal Relevance):** pick each next result by its relevance minus its similarity to the results already picked.
- **Cap per document:** keep at most 1 or 2 chunks from each source document.
- **Dedupe at ingestion** first (Topic 1), so fewer copies reach search at all.
Diagram: two columns of 5 stacked boxes. Left, "Without MMR": five boxes all labeled "Refund policy (copy)". Right, "With MMR", in gold: "Refund policy", "Refund FAQ", "Billing ticket", "Exceptions page", "Contractor policy".

#### Deep dive: Select complementary evidence without rewarding irrelevance
Five near-identical chunks can fill the prompt while adding almost no coverage. Diversity selection tries to keep relevant passages that contribute different useful information.

**Maximal marginal relevance**, or MMR, balances relevance to the question with redundancy against already selected passages. After choosing the contractor allowance, it may prefer a relevant exclusion over another copy of the allowance.

Novelty alone is not useful. An unrelated calendar page is very different from the allowance but contributes no evidence. Tune relevance and redundancy together, and check answer coverage on multi-part questions.

Deduplicate exact or near-identical chunks by source, version and content. Keep distinctions that matter: two similar paragraphs may apply to different regions or user groups. Aggressive deduplication can erase those exceptions.

Evaluate the selected set rather than only each passage in isolation. Ask whether it covers the claims needed for the answer, preserves authoritative versions and fits the token budget. Diversity is a tool for evidence coverage, not a requirement to mention every source type.

### S9. Business rules on top
Relevance isn't the only signal. The final order often mixes in:
- **Freshness:** prefer the applicable effective version.
- **Authority:** the official handbook beats a chat thread.
- **Personalization:** the user's team, region or product.
- **Hard rules:** never show drafts; always include the security policy for security questions.

Enforce access and eligibility before context reaches the model. Apply tested preferences among allowed sources, with explicit authority and version rules.

#### Deep dive: Resolve authority and eligibility before adding business preferences
Business rules can change which sources appear first. Some rules are hard eligibility constraints; others are soft preferences. Mixing them into one arbitrary score makes failures difficult to explain.

Access control is hard: forbidden text is excluded. Source authority may also be a hard rule for a task, such as answering policy questions only from approved policies. Freshness often requires checking effective versions rather than simply favoring the newest timestamp.

A recent employee discussion is not automatically more authoritative than an older policy still in force. If two approved sources conflict, show or resolve the conflict using explicit precedence rules. Do not average their wording into a third policy.

Within eligible evidence, a tested boost may prefer current official material. Tune its effect on relevance using examples where the preferred source is weak or incomplete.

Keep the reason for a promotion visible in safe trace metadata. A reviewer should be able to distinguish semantic relevance, policy authority and freshness. A single unexplained blended score hides which rule selected a wrong passage.

### S10. Fine-tuning a re-ranker
Off-the-shelf re-rankers learned from web search data. Your domain (legal clauses, internal jargon, code) may look very different.
- Collect pairs of (query, right chunk) from clicks, thumbs-up votes or labeled evals.
- Add **hard negatives:** chunks that look similar but are wrong for the query.
- Fine-tune a small cross-encoder on a few thousand pairs.
- Compare it with the base model on held-out questions before shipping.

Hard negatives matter most. They teach the fine distinctions that first-stage search can't see.

#### Deep dive: Train on meaningful positives and difficult negatives
Reranker training uses queries paired with relevant and irrelevant passages. A positive should contain supporting evidence, not merely share the topic. A useful negative looks plausible but fails a specific requirement.

For a contractor chair question, an employee furniture allowance is a hard negative. It shares vocabulary but applies to the wrong audience. An unrelated weather page is an easy negative that teaches little about the real error.

Collect judgments from reviewed retrieval failures and representative queries. Include no-answer cases, languages and source types. If click data supplies labels, account for position bias: users see and click higher-ranked results more often regardless of true relevance.

Split evaluation by document families or time where appropriate. Near-duplicate chunks from the same policy in training and test can exaggerate improvement. Keep a held-out set untouched while selecting the model.

After training, measure ranking quality, downstream answers and serving cost. Improving pairwise classification alone does not prove the final prompt contains complete, current, permitted evidence.

### S11. Measuring re-ranking
Compare the top of the list before and after re-ranking, on the same questions:
- **Hit rate@5:** how often a right chunk is in the top 5.
- **MRR:** how high the first right chunk ranks, on average.
- **nDCG@10:** rewards putting the most relevant chunks first when some are more relevant than others.
- **Latency p95 and cost** per question.

Judge added latency against the measured quality gain and the task's impact. Inspect critical slices before choosing.

#### Deep dive: Measure the reranker on fixed candidates, then test the whole answer
To isolate reranking, compare methods using the same query and candidate lists. Otherwise a retrieval change may receive credit for a ranking improvement it did not cause.

Ranking metrics reward useful passages appearing early. MRR focuses on the first relevant result. NDCG can use graded relevance and discounts lower positions. State the labels and cutoff rather than presenting a metric name without a definition.

Next, run context assembly and generation on the selected passages. A ranking gain may not improve answers if the context builder truncates the key sentence or the generator ignores it. Measure correctness, evidence support and coverage separately.

Report latency and cost under realistic load alongside quality. A slower reranker may be justified for high-impact answers, but it must fit the service budget or use explicit routing.

Inspect regressions by query slice, especially no-answer questions, exact identifiers and sensitive policies. The best average score can still conceal a failure that matters more than the gain. Keep those cases as regression tests for later changes.

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
