# Topic 3: Retrieval strategy, v2 (replaces all Topic 3 slides and questions)

Slide bodies support short paragraphs, bullet lists and numbered lists. Keep the wording as written.
Diagrams: clean vector SVG, Inter, theme colors, square boxes, clear arrows. Landscape at desktop (max 200 px tall), portrait below 600 px wide. Gold marks the thing to notice.

## Slides

### S1. Retrieval is the ceiling
If the right chunk isn't in the top results, the LLM can't use it. Retrieval quality caps answer quality.

Measure retrieval on its own:
- **Recall@k:** the share of relevant chunks found in the top k. Hit rate@k asks whether at least one right chunk was found.
- **MRR:** how high the first right chunk ranks, on average.

Build a test set of 100 to 200 real questions with their right chunks before you tune anything. Topic 7 goes deeper on evaluation.

#### Deep dive: Find the first place the supporting evidence disappears
Generation can explain only the evidence it receives, plus whatever unsupported knowledge it invents. If the current contractor exception never reaches the model, a better writing prompt cannot reliably reconstruct it.

Follow a failed question through four checkpoints. Does the source contain the answer? Did ingestion preserve it in a searchable passage? Did retrieval return that passage? Did context assembly keep it? Only then inspect whether generation used it correctly.

For example, search may return the general equipment allowance but miss a furniture exclusion in the next paragraph. The answer can sound reasonable while being wrong. The first fix may be a better chunk boundary or adjacent-section fetch, rather than a larger generator.

Build a small set of questions with labeled supporting passages and current source versions. Measure whether that evidence enters the retrieved shortlist and the final context separately. A high retrieval score does not help if a later budget cut removes the decisive sentence.

This is a quality ceiling, not a promise that finding the passage guarantees a good answer. Generation can still omit exceptions, cite the wrong source or combine incompatible rules. Keep retrieval and answer checks separate so you know which change helped.

### S2. Dense search: matching meaning
Dense search embeds the query and finds the nearest chunk vectors.

Good at:
- Paraphrases and synonyms: "get my money back" finds "Refund policy".
- Natural-language questions.

Weak at:
- Exact strings: IDs, error codes, SKUs, rare names.
- Negation: "not covered" can sit close to "covered".
- Very short queries that carry little meaning.

#### Deep dive: Use semantic matches, but preserve exact constraints
Dense retrieval represents questions and passages as learned vectors. It can connect a paraphrase such as "How do I reclaim a purchase?" with a passage titled "Expense reimbursement" even when few words overlap.

That strength does not make every close passage useful. "Employees qualify" and "Contractors do not qualify" may be semantically close because both discuss eligibility. A short error code or policy identifier can also carry more meaning than the surrounding natural language.

For an exact code like ERR-204, check whether dense search retrieves that code rather than a similarly worded error. Keep identifiers, negations and dates in your evaluation set. A general language similarity score is not a correctness check.

Embed the question with the intended query encoder and search eligible document vectors. Return original text, IDs and source versions for later checks. Avoid treating the vector itself as evidence.

If the dense path misses exact terms, add complementary lexical retrieval or a structured filter when justified. Measure the combined candidate set. Do not replace all keyword matching merely because embeddings handle paraphrases well.

### S3. Keyword search: BM25
BM25 scores a chunk by the query words it contains:
- Rare words count more than common ones. "ERR_4012" matters more than "the".
- Repeating a word helps, but less each time.
- Long chunks are normalized, so they don't win just by being long.

Good at exact terms, codes, names and acronyms. Weak at synonyms. It's cheap, fast and needs no model.

Learned sparse models such as SPLADE add related words to each chunk, which closes part of the synonym gap.

#### Deep dive: Why a rare exact term can beat a broad semantic match
**BM25** is a lexical ranking method. It rewards matching query terms while accounting for how common they are, how often they occur in a document and the document's length.

A rare term such as a specific error code is often more informative than "help" appearing throughout the corpus. Repeating a term helps only up to a point: BM25 uses term-frequency saturation, so saying "payroll" a hundred times does not make a passage a hundred times more relevant. Length normalization reduces the advantage of long documents containing many incidental matches.

Imagine searching "P-204 contractor chair". A passage containing P-204 and the contractor exception may outrank a general furniture page. This exact-term behavior complements dense search, which may find related wording but overlook the identifier.

Tokenization and analyzers matter. Hyphens, case, stemming and language handling can change which terms match. Test product codes and abbreviations using the actual production analyzer.

BM25 still cannot prove that a sentence supports an answer. A passage mentioning both permission and denial might match every word while expressing the opposite rule. Use retrieval to find candidates, then check meaning and source authority.

### S4. Hybrid search
Run keyword and dense search in parallel and merge the two lists. They can catch different misses. Compare the combined system with each baseline on your own questions.

Two ways to merge:
- **Score blending:** normalize both scores, then weight them, for example 0.7 dense + 0.3 keyword. Needs tuning, because the scales differ.
- **Reciprocal Rank Fusion (RRF):** uses ranks only. Simple, robust and a strong default.
Diagram: Query splits into two boxes, "Keyword (BM25)" and "Dense (vectors)". Each produces a short ranked list. Both lists flow into a gold "Merge (RRF)" box, then "Top results".

#### Deep dive: Combine complementary searches before selecting evidence
Hybrid retrieval runs lexical and semantic search, then combines their candidates. The lexical path catches exact names and codes; the dense path catches paraphrases. The aim is to reduce each path's misses.

Suppose dense search returns the general contractor policy and keyword search returns the exact P-204 exception. Merge the lists by stable chunk ID and source version. Otherwise the same passage can take several slots simply because both retrievers found it.

Do not add raw scores blindly. A lexical score of 8 and a cosine score of 0.8 are not measurements on the same scale. Use a tested fusion method, such as rank fusion, or calibrate a combined ranking with appropriate labels.

Apply tenant and permission constraints to both retrieval paths. A safe vector search followed by an unrestricted keyword query still leaks evidence into the candidate pool or prompt.

Evaluate dense-only, lexical-only and hybrid on the same held-out questions. Measure evidence recall, latency and failure slices. More candidates increase reranking and context costs. Keep the hybrid path when its additional evidence is worth that cost, rather than assuming two searches must always outperform one.

### S5. RRF, step by step
Each document gets 1 / (k + rank) from every list it appears in. k is often 60.

With k = 60:
- **Doc A:** rank 1 in keyword, rank 2 in dense: 1/61 + 1/62 = about 0.0325
- **Doc B:** rank 3 in keyword, rank 1 in dense: 1/63 + 1/61 = about 0.0323
- **Doc C:** rank 2 in keyword only: 1/62 = about 0.0161

In this example, support from both lists puts A and B ahead of C. Fusion ranks candidates; it does not prove relevance.
Diagram: three columns. "Keyword": 1 Doc A, 2 Doc C, 3 Doc B. "Dense": 1 Doc B, 2 Doc A. "RRF": 1 Doc A, 2 Doc B, 3 Doc C, with Doc A and Doc B in gold.

#### Deep dive: Calculate reciprocal rank fusion without confusing it with confidence
**Reciprocal rank fusion**, or RRF, combines positions from several ranked lists. For each passage, add 1 divided by a smoothing constant plus its rank in each list. A passage missing from a list contributes nothing from that list.

Using an illustrative constant of 60, passage A ranked first in dense search and tenth in keyword search gets 1/61 + 1/70, about 0.0307. Passage B ranked second in both gets 2/62, about 0.0323. B wins because both retrievers place it near the top.

The constant controls how strongly rank differences matter. It is a configuration choice, not a probability threshold. A fused score of 0.03 does not mean 3% relevance or answer confidence.

Deduplicate by passage identity before presenting candidates downstream. Keep source versions so obsolete and current chunks are not accidentally treated as the same evidence.

RRF avoids comparing incompatible raw score scales, but it ignores the size of the original score gaps. Test its shortlist against labeled evidence and the downstream reranker. If a retriever systematically returns irrelevant passages, rank fusion cannot make that retriever trustworthy.

Read more: [Reciprocal rank fusion formula](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/reciprocal-rank-fusion)

### S6. Query rewriting
Users type messy queries. Fix them before you search:
- **Standalone rewrite:** in a chat, turn "what about contractors?" into "PTO policy for contractors", using the conversation.
- **Clean up:** fix typos, expand acronyms ("PTO" to "paid time off"), drop filler words.
- **HyDE:** ask an LLM to write a short fake answer, then embed that. A fake answer often looks more like the real document than the question does.

Each rewrite is an extra LLM call, often a few hundred ms. Use a small, fast model.

#### Deep dive: Rewrite the question without inventing its meaning
A query rewrite makes an ambiguous conversational request searchable. After "Tell me about contractor leave", the follow-up "What about part-time?" may need the earlier topic to become "part-time contractor leave policy".

The rewrite must preserve the user's actual constraints. It should not turn "Can contractors claim chairs?" into "employee furniture allowance", drop a negative or add a country the user never mentioned.

Keep the original question and rewrite together in the trace. Evaluate whether the rewrite retrieves better evidence and whether it changes the intended question. Useful tests include abbreviations, exact error codes, multi-turn references and conflicting conversation context.

A model can produce a fluent rewrite that is wrong. If the reference is unclear, ask a clarifying question or search multiple plausible interpretations with bounded cost. Do not silently resolve a high-impact ambiguity.

The generator still answers the user's original request. A retrieval rewrite is a search aid, not a new instruction or a replacement user intent. Apply permission constraints after rewriting just as you would for any other search.

### S7. Multi-query and decomposition
- **Multi-query:** write 3 to 5 versions of the question, search each, merge with RRF. Better recall for vague questions.
- **Decomposition:** split a compound question into parts. "Compare the 2025 and 2026 parental leave policies" becomes one search per year.

Run the searches in parallel. Added latency is the rewrite call plus the slowest search, not the sum of all searches.
Diagram: Question, then "LLM rewrite", then three query boxes side by side, each into its own "Search" box, all merging into a gold "RRF merge" box, then "Results".

#### Deep dive: Separate alternative wording from a multi-part research task
**Multi-query retrieval** searches several phrasings of one intent. "Expense claim for a chair" and "contractor furniture reimbursement" may uncover complementary wording. Merge and deduplicate their results before reranking.

**Decomposition** splits a genuinely multi-part request. "Compare contractor equipment policy in two regions" needs evidence for each region, then a comparison. Retrieving only one side creates a misleading answer even if that side is correct.

These methods increase fan-out. Three rewrites across two retrievers create six searches before reranking. Bound the number of queries, set a request deadline and share a candidate budget. More parallel work can worsen tail latency and overload dependencies.

Another technique generates a hypothetical answer-like passage and searches with its embedding. That text can help retrieval, but it is invented. Never treat it as a source or cite it as factual evidence.

Use labels for each required sub-answer so you can detect incomplete coverage. If one branch fails, explain the missing part rather than blending partial results into a confident whole. Add complexity only when measured query failures justify it.

### S8. Filters and boosts
Metadata turns "similar" into "relevant right now":
- **Hard filters:** product = billing, language = en, user can access. Apply them inside the search (Topic 2).
- **Soft boosts:** rank newer or more trusted documents higher without hiding the rest.
- **Filters from the question:** "2026 pricing" becomes year = 2026, using rules or a small LLM call.

Old and new versions of a page look almost the same to an embedding. Only metadata can tell them apart.

#### Deep dive: Hard filters decide eligibility; boosts decide preference
A hard filter removes ineligible evidence. Tenant boundaries, user permissions and an explicitly requested region are examples. A soft boost changes preference among evidence that is already allowed, such as favoring an approved policy source.

Do not represent a permission rule as a low score. A forbidden salary file must be excluded, even if it is the only document that matches the question. Likewise, a failed permission service must not trigger an unfiltered fallback.

Freshness is more subtle. A recently edited discussion thread is not automatically more authoritative than an older approved policy. Model source authority and effective version explicitly before adding recency preferences.

For a concrete test, give two users the same query but different document access. Neither the retrieved candidates, context nor cached answer should expose the other's restricted evidence. Then revoke access while a result is cached and repeat the query.

Evaluate the quality effect too. Filters can leave too few candidates or exclude relevant documents with missing metadata. Fix the metadata and retrieval strategy rather than weakening the security rule to improve recall.

### S9. How many results?
Retrieve wide, then narrow:
- Fetch 50 to 100 candidates.
- Re-rank them (Topic 4).
- Send the best 5 to 10 to the LLM.

Too few, and the right chunk sits just past the cutoff. Too many, and you pay for more tokens while the model misses facts buried in the middle of a long context.

Be careful with fixed score cutoffs. Scores aren't comparable across queries, so a fixed threshold can drop good results.
Diagram: a funnel with four levels: "1M chunks", "100 candidates" (Retrieve), "10" (Re-rank), "5 in the prompt" in gold.

#### Deep dive: Choose separate budgets for retrieval and the final prompt
The number of retrieved candidates and the number of passages shown to the model solve different problems. A larger retrieval shortlist can improve evidence recall. A smaller, selected prompt can reduce distraction, tokens and latency.

Suppose the supporting exception ranks 18th. Fetching only ten candidates guarantees that a later reranker cannot rescue it. Fetching 50 may include it, but placing all 50 in the prompt can bury the rule among irrelevant text.

Measure recall as you increase the shortlist size. Then measure reranker cost and answer quality as you vary the final context budget. Use the same held-out questions so a quality gain is not merely a different test mix.

Set budgets in both passages and tokens. Five short passages and five entire manuals are not equivalent. Preserve enough neighboring context to understand headings, references and exceptions.

If no eligible evidence is good enough, filling every prompt slot is not the goal. A clear no-answer response is better than padding context with weak matches. Pick a cutoff and fallback based on labeled answerable and unanswerable queries.

### S10. Routing: search the right place
Real systems have several sources: docs, tickets, code, a SQL database.
- A router (rules or a small LLM) picks which sources to search, or whether to search at all.
- "What's our refund policy?" goes to the docs index.
- "How many refunds did we issue last week?" goes to SQL. Vector search can't count.

Searching every source every time adds latency and noise.

#### Deep dive: Route to likely sources without hiding the answer
Routing selects which collections or services to search. A request about a ticket ID may go to tickets; a policy question may go to approved documents. It can reduce work, but a wrong route can exclude the only supporting source.

For "Why was contractor access removed?", evidence might live in a policy page and an incident ticket. A single collection label may be too narrow. Search multiple likely sources when the question spans them, while keeping the fan-out bounded.

Use explicit metadata where reliable, such as a known ticket identifier. If a model chooses a route, test ambiguous questions and provide a fallback for low-confidence or empty retrieval. Routing confidence is not the same as answer confidence.

Every searched collection must enforce the same user identity and access rules. A cross-source search should not gain broader credentials merely because one connector is easier to call.

Measure route recall: how often did routing include a source containing the needed evidence? End-to-end retrieval can look poor even when each individual search engine works well, simply because the router never called the right one.

### S11. Debugging bad retrieval
When an answer is wrong, check retrieval first:
1. Is the right chunk in the index at all? If not, it's an ingestion bug (Topic 1).
2. Is it in the top 100? If not, try hybrid search or query rewriting.
3. In the top 100 but not the top 5? It's a ranking problem. Add re-ranking (Topic 4).
4. In the prompt, but the answer is still wrong? It's a generation problem (Topic 6).

Trace request IDs, safe evidence references, scores and pipeline versions. Keep raw text only under a restricted debugging and retention policy.

#### Deep dive: Debug using passage IDs and versions at each boundary
Start with one reproducible failed question and the user's permitted source set. Save enough safe identifiers to reconstruct the path: source version, chunk IDs, index version, retrieval ranks and the passages selected for context.

If the source is missing, investigate the connector and ingestion checkpoint. If the source exists but the exception disappeared, inspect extraction and chunking. If the passage is indexed but absent from candidates, inspect the query, filters, search settings and index freshness.

If the right passage reaches the shortlist but not the prompt, inspect reranking, deduplication and token budgeting. If it reaches the prompt and the answer is still wrong, inspect generation and support checks.

For example, a permission filter with an outdated group list can either exclude useful evidence or admit forbidden material. An embedding change cannot repair that metadata problem.

Use access-controlled diagnostic samples rather than logging every full question, document and prompt. IDs and timings often locate the first failure without copying sensitive text into a second system. Turn the reproduced case into a regression test before changing the pipeline.

Diagram: retrieval-debug-case

### S12. Interview checklist
When asked "How would you retrieve the right context?", cover:
- Hybrid search (BM25 plus dense), merged with RRF
- Query rewriting for chat follow-ups
- Filters for permissions, product and freshness, inside the search
- Retrieve wide (50 to 100), re-rank, send the best few
- Recall@k on a labeled question set to prove it works

Explaining why dense search alone misses error codes and IDs is a strong Senior signal.

## Questions

T3-Q1 · Error codes
Slide: S2
A user searches "ERR_4012 timeout" and dense-only search misses the doc that mentions ERR_4012. Why?
- ✓ Embeddings blur rare exact strings like codes; add keyword search
- The embedding dimension is too small to store a code like that one
- The chunk overlap pushed the error code into a neighboring chunk
- The query is too short, so it must be expanded into 5 variants first
Key idea: Keyword search catches exact strings that vectors blur.
Why: Embeddings capture meaning. "ERR_4012" carries little meaning, but it's an exact match for BM25.
If wrong (The embedding dimension is too small to store a code like that one): More dimensions won't help. A code has little meaning for the model to capture.
If wrong (The chunk overlap pushed the error code into a neighboring chunk): Overlap repeats text; it doesn't hide it. The miss comes from the search method.
If wrong (The query is too short, so it must be expanded into 5 variants first): Expansion adds cost and noise. An exact keyword match finds it directly.

T3-Q2 · Meaning match
Slide: S2
Which search is dense retrieval better at than keyword search?
- ✓ "how do I get my money back" finding a doc titled "Refund policy"
- "SKU-88213" finding the product page that lists that exact SKU
- "RFC 7231" finding the spec that has that number in its title
- "ERR_4012" finding the runbook that lists that exact error code
Key idea: Dense search matches meaning even with no shared words.
Why: "money back" and "refund" share no words but mean the same thing.
If wrong ("SKU-88213" finding the product page that lists that exact SKU): Exact IDs are where keyword search is strongest.
If wrong ("RFC 7231" finding the spec that has that number in its title): An exact number in a title is a keyword match.
If wrong ("ERR_4012" finding the runbook that lists that exact error code): Rare codes are where keyword search beats dense search.

T3-Q3 · RRF score (math)
Slide: S5
With RRF and k = 60, a document is rank 1 in keyword search and rank 3 in dense search. What's its fused score?
- ✓ About 0.032
- About 0.016
- About 1.33
- About 0.0003
Key idea: RRF adds 1 / (k + rank) from each list.
Why: 1/61 + 1/63 = 0.0164 + 0.0159 = about 0.032.
If wrong (About 0.016): That counts only one list.
If wrong (About 1.33): That forgets k: 1/1 + 1/3.
If wrong (About 0.0003): That multiplies the two parts. RRF adds them.

T3-Q4 · Follow-up queries
Slide: S6
Spot the flaw: in a chat, the user's follow-up is "what about contractors?", and retrieval searches just that text.
- ✓ The query lacks context; rewrite it into a standalone question
- Contractors should be filtered out of the index for privacy reasons
- The chunks are too large to match such a short, specific question
- A reranker would fix this without any change to the query itself
Key idea: Rewrite follow-ups into standalone queries before searching.
Why: "what about contractors?" alone matches almost anything. "PTO policy for contractors" matches the right doc.
If wrong (Contractors should be filtered out of the index for privacy reasons): That hides the very documents the user is asking about.
If wrong (The chunks are too large to match such a short, specific question): Chunk size isn't the problem. The query is missing "PTO policy".
If wrong (A reranker would fix this without any change to the query itself): A reranker only reorders what search found, and search used the wrong query.

T3-Q5 · Multi-query cost
Slide: S7
What's the main trade-off of multi-query expansion?
- ✓ Better recall, but extra latency and cost per question
- Better precision, but it usually lowers recall for vague questions
- Lower cost per question, but answers get noticeably worse
- It replaces the reranker, so the pipeline gets simpler
Key idea: More searches find more, but each one costs time and money.
Why: You add an LLM call to write the variants, plus several searches to run and merge.
If wrong (Better precision, but it usually lowers recall for vague questions): More queries usually raise recall. The extra results can add noise.
If wrong (Lower cost per question, but answers get noticeably worse): It costs more: an LLM call plus several searches.
If wrong (It replaces the reranker, so the pipeline gets simpler): Merging more results makes good ranking matter even more.

T3-Q6 · Old pricing
Slide: S8
Spot the flaw: a user asks about 2026 pricing, and the 2023 pricing page ranks first.
- ✓ Ranking ignores dates; filter or boost by date and version
- The embedding model is broken and needs to be replaced
- The chunks are too small to include the year in the text
- The LLM temperature is too high, so it picks older facts
Key idea: Use metadata to keep results current.
Why: Old and new pricing pages look almost the same to an embedding. Only date or version metadata separates them.
If wrong (The embedding model is broken and needs to be replaced): The model works. Any embedding model sees the two pages as near twins.
If wrong (The chunks are too small to include the year in the text): Even with the year in the text, the vectors stay close. Use metadata.
If wrong (The LLM temperature is too high, so it picks older facts): Temperature affects wording, not which page search ranks first.

T3-Q7 · Multi-query latency (math)
Slide: S7
Multi-query: an LLM rewrite takes 300 ms, then 4 searches of 40 ms each run in parallel, then merging takes 10 ms. How much latency does this add compared with one 40 ms search?
- ✓ About 310 ms
- About 430 ms
- About 120 ms
- About 350 ms
Key idea: Parallel searches cost the slowest one, not the sum.
Why: 300 + 40 + 10 = 350 ms in total, versus 40 ms before, so about 310 ms more.
If wrong (About 430 ms): That runs the 4 searches one after another.
If wrong (About 120 ms): That counts only the extra searches and forgets the 300 ms rewrite.
If wrong (About 350 ms): That's the total. The question asks how much it adds to the 40 ms search.

T3-Q8 · Too much context (new)
Slide: S9
Spot the flaw: to be safe, the system sends the top 50 retrieved chunks straight into the prompt.
- ✓ It wastes tokens and buries key facts; re-rank and send the best few
- Fifty is too few; send the top 200 so that nothing ever gets missed
- The LLM can't accept more than 10 chunks at once, so the request fails
- No flaw: more context always makes the final answer more accurate
Key idea: Retrieve wide, re-rank, send few.
Why: Every chunk costs tokens, and models miss facts buried in long, noisy context.
If wrong (Fifty is too few; send the top 200 so that nothing ever gets missed): More chunks means more cost and more noise. Retrieve wide, but send few.
If wrong (The LLM can't accept more than 10 chunks at once, so the request fails): Context windows hold far more. The problem is cost and focus, not a hard limit.
If wrong (No flaw: more context always makes the final answer more accurate): Models often miss facts in the middle of long context, and you pay for every token.

T3-Q9 · Count, don't search (new)
Slide: S10
A user asks, "How many refunds did we issue last week?" What should the system do?
- ✓ Route it to a SQL query on the orders data
- Search the refund policy docs and let the LLM estimate
- Run hybrid search over tickets and count the matches
- Ask the LLM directly; it has seen refund data before
Key idea: Route each question to the source that can answer it.
Why: Counting needs a database query. Vector search returns similar text, not totals.
If wrong (Search the refund policy docs and let the LLM estimate): Policy docs explain refunds; they don't count them. The LLM would guess.
If wrong (Run hybrid search over tickets and count the matches): Ticket matches aren't refunds, and top-k search never returns every row.
If wrong (Ask the LLM directly; it has seen refund data before): The model has never seen your data. It would make up a number.

T3-Q10 · Ranked 37th (new)
Slide: S11
The right chunk ranks 37th for a question, but only the top 5 go into the prompt. What's the best next step?
- ✓ Re-rank the top 50 so the right chunk moves up
- Re-chunk every document, since the chunk is missing from the index
- Switch to a larger LLM so it can answer without that chunk
- Lower the LLM temperature so it stops guessing the answer
Key idea: Found but ranked too low is a ranking problem.
Why: Search already found the chunk. A re-ranker scores the top candidates more carefully and moves it into the top 5.
If wrong (Re-chunk every document, since the chunk is missing from the index): It's in the index: it ranked 37th. Fix the ranking, not ingestion.
If wrong (Switch to a larger LLM so it can answer without that chunk): No model can use a chunk it never sees.
If wrong (Lower the LLM temperature so it stops guessing the answer): Temperature doesn't change which chunks reach the prompt.
