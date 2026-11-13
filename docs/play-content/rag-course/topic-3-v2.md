# Topic 3: Retrieval strategy, v2 (replaces all Topic 3 slides and questions)

Slide bodies support short paragraphs, bullet lists and numbered lists. Keep the wording as written.
Diagrams: clean vector SVG, Inter, theme colors, square boxes, clear arrows. Landscape at desktop (max 200 px tall), portrait below 600 px wide. Gold marks the thing to notice.

## Slides

### S1. Retrieval is the ceiling
If the right chunk isn't in the top results, the LLM can't use it. Retrieval quality caps answer quality.

Measure retrieval on its own:
- **Recall@k:** how often a right chunk shows up in the top k.
- **MRR:** how high the first right chunk ranks, on average.

Build a test set of 100 to 200 real questions with their right chunks before you tune anything. Topic 7 goes deeper on evaluation.

### S2. Dense search: matching meaning
Dense search embeds the query and finds the nearest chunk vectors.

Good at:
- Paraphrases and synonyms: "get my money back" finds "Refund policy".
- Natural-language questions.

Weak at:
- Exact strings: IDs, error codes, SKUs, rare names.
- Negation: "not covered" can sit close to "covered".
- Very short queries that carry little meaning.

### S3. Keyword search: BM25
BM25 scores a chunk by the query words it contains:
- Rare words count more than common ones. "ERR_4012" matters more than "the".
- Repeating a word helps, but less each time.
- Long chunks are normalized, so they don't win just by being long.

Good at exact terms, codes, names and acronyms. Weak at synonyms. It's cheap, fast and needs no model.

Learned sparse models such as SPLADE add related words to each chunk, which closes part of the synonym gap.

### S4. Hybrid search
Run keyword and dense search in parallel and merge the two lists. Each catches what the other misses, so hybrid usually beats either one alone.

Two ways to merge:
- **Score blending:** normalize both scores, then weight them, for example 0.7 dense + 0.3 keyword. Needs tuning, because the scales differ.
- **Reciprocal Rank Fusion (RRF):** uses ranks only. Simple, robust and a strong default.
Diagram: Query splits into two boxes, "Keyword (BM25)" and "Dense (vectors)". Each produces a short ranked list. Both lists flow into a gold "Merge (RRF)" box, then "Top results".

### S5. RRF, step by step
Each document gets 1 / (k + rank) from every list it appears in. k is often 60.

With k = 60:
- **Doc A:** rank 1 in keyword, rank 2 in dense: 1/61 + 1/62 = about 0.0325
- **Doc B:** rank 3 in keyword, rank 1 in dense: 1/63 + 1/61 = about 0.0323
- **Doc C:** rank 2 in keyword only: 1/62 = about 0.0161

Showing up in both lists beats ranking high in just one.
Diagram: three columns. "Keyword": 1 Doc A, 2 Doc C, 3 Doc B. "Dense": 1 Doc B, 2 Doc A. "RRF": 1 Doc A, 2 Doc B, 3 Doc C, with Doc A and Doc B in gold.

### S6. Query rewriting
Users type messy queries. Fix them before you search:
- **Standalone rewrite:** in a chat, turn "what about contractors?" into "PTO policy for contractors", using the conversation.
- **Clean up:** fix typos, expand acronyms ("PTO" to "paid time off"), drop filler words.
- **HyDE:** ask an LLM to write a short fake answer, then embed that. A fake answer often looks more like the real document than the question does.

Each rewrite is an extra LLM call, often a few hundred ms. Use a small, fast model.

### S7. Multi-query and decomposition
- **Multi-query:** write 3 to 5 versions of the question, search each, merge with RRF. Better recall for vague questions.
- **Decomposition:** split a compound question into parts. "Compare the 2025 and 2026 parental leave policies" becomes one search per year.

Run the searches in parallel. Added latency is the rewrite call plus the slowest search, not the sum of all searches.
Diagram: Question, then "LLM rewrite", then three query boxes side by side, each into its own "Search" box, all merging into a gold "RRF merge" box, then "Results".

### S8. Filters and boosts
Metadata turns "similar" into "relevant right now":
- **Hard filters:** product = billing, language = en, user can access. Apply them inside the search (Topic 2).
- **Soft boosts:** rank newer or more trusted documents higher without hiding the rest.
- **Filters from the question:** "2026 pricing" becomes year = 2026, using rules or a small LLM call.

Old and new versions of a page look almost the same to an embedding. Only metadata can tell them apart.

### S9. How many results?
Retrieve wide, then narrow:
- Fetch 50 to 100 candidates.
- Re-rank them (Topic 4).
- Send the best 5 to 10 to the LLM.

Too few, and the right chunk sits just past the cutoff. Too many, and you pay for more tokens while the model misses facts buried in the middle of a long context.

Be careful with fixed score cutoffs. Scores aren't comparable across queries, so a fixed threshold can drop good results.
Diagram: a funnel with four levels: "1M chunks", "100 candidates" (Retrieve), "10" (Re-rank), "5 in the prompt" in gold.

### S10. Routing: search the right place
Real systems have several sources: docs, tickets, code, a SQL database.
- A router (rules or a small LLM) picks which sources to search, or whether to search at all.
- "What's our refund policy?" goes to the docs index.
- "How many refunds did we issue last week?" goes to SQL. Vector search can't count.

Searching every source every time adds latency and noise.

### S11. Debugging bad retrieval
When an answer is wrong, check retrieval first:
1. Is the right chunk in the index at all? If not, it's an ingestion bug (Topic 1).
2. Is it in the top 100? If not, try hybrid search or query rewriting.
3. In the top 100 but not the top 5? It's a ranking problem. Add re-ranking (Topic 4).
4. In the prompt, but the answer is still wrong? It's a generation problem (Topic 6).

Log the query, the retrieved IDs and their scores for every request, so you can replay failures.

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
