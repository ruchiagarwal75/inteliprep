# Topic 7: Evaluation, v1 (new topic)

Slide bodies support short paragraphs, bullet lists and numbered lists. Keep the wording as written.
Diagrams: clean vector SVG, Inter, theme colors, square boxes, clear arrows. Landscape at desktop (max 200 px tall), portrait below 600 px wide. Gold marks the thing to notice.

## Slides

### S1. Why RAG needs its own evals
"It looked good in the demo" isn't evidence. RAG has many moving parts, and a change to one (chunk size, embedding model, prompt) can quietly break another.

Evaluate in two layers:
- **Retrieval:** did we fetch the right chunks?
- **Generation:** given those chunks, is the answer faithful, relevant and correct?

Keep them separate. When a score drops, you'll know which half to fix.
Diagram: "Question" into a "Retrieval" box, then "Chunks", then a "Generation" box, then "Answer". Under Retrieval, a gold tag "recall@k, MRR". Under Generation, a gold tag "faithfulness, correctness".

### S2. Building a test set
Start with 100 to 300 real questions. Give each one:
- the IDs of the right chunks, for retrieval
- a reference answer or key facts, for generation

Good sources: real user logs (with personal data removed), support tickets, and questions written by domain experts.

Include hard cases: questions the docs can't answer, multi-part questions, questions that need the newest version, and restricted content. Keep a held-out set that you never tune against.

### S3. Synthetic questions
When real questions are scarce, an LLM can write them from your chunks: "Write a question this paragraph answers."
- Fast and cheap, even for thousands.
- But they tend to reuse the chunk's own words, so retrieval looks easier than it really is.
- Fix: ask for paraphrased, realistic questions, and mix in real ones.
- Review a sample by hand before trusting the set.

### S4. Retrieval metrics
- **Recall@k:** of the right chunks for a question, the share found in the top k. With one right chunk per question, this equals hit rate@k.
- **Precision@k:** of the top k, the share that are right.
- **MRR:** 1 / rank of the first right chunk, averaged over questions. Rank 1 scores 1.0; rank 4 scores 0.25.
- **nDCG@k:** like MRR, but it handles many right chunks and graded relevance.

Retrieval metrics need no LLM, so they're fast and cheap to run on every change.
Diagram: a ranked list of 5 result boxes, numbered 1 to 5. Box 2 is gold and labeled "Right chunk". On the right: "Hit@5: yes" and "Reciprocal rank: 1/2 = 0.5".

### S5. Generation metrics
- **Faithfulness:** are the answer's claims supported by the retrieved context?
- **Answer relevance:** does it answer the question that was asked?
- **Correctness:** does it match the reference answer or key facts?
- **Citation accuracy:** do the cited chunks support their sentences?
- **Refusal accuracy:** does it say "I don't know" when the docs lack the answer, and only then?

Faithful isn't the same as correct. An answer can faithfully repeat an outdated chunk and still be wrong.

### S6. LLM as a judge
Grading thousands of answers by hand doesn't scale, so teams use an LLM judge.
- Give it a narrow rubric, and ask for a score plus a one-line reason. For example: "Is every claim supported by the context? Yes or no."
- Prefer yes/no or 1-to-3 scales over 1-to-10. They're more consistent.
- Known biases: it favors longer answers, its own style, and whichever option comes first.
- Calibrate: have people label 50 to 100 cases, and check how often the judge agrees before you trust it.
Diagram: "Question + context + answer" and "Rubric" both feed a gold "Judge LLM" box, which outputs "Score + reason". Beside it, "Human labels" and the judge's scores feed an "Agreement: 90%" box.

### S7. Regression gates
Run the eval set on every meaningful change: prompt, model, chunking, embeddings, re-ranker.
- Track each metric over time, per change.
- Gate releases in CI: for example, block if faithfulness drops more than 2 points or recall@10 falls below a floor.
- Read the failed cases, not just the averages.
- Slice by question type: lookups, multi-part, no-answer, recent changes. One average can hide a broken slice.
Diagram: three pairs of horizontal bars, "Before" and "After". "Recall@10: 92% to 93%" (fine). "Faithfulness: 95% to 91%" in red with a gold stamp "Gate: blocked". "Latency p95: 1.2 s to 1.2 s" (fine).

### S8. Online evaluation
Offline sets get stale. Watch real traffic too:
- **Explicit feedback:** thumbs up or down, and "report a wrong answer".
- **Implicit signals:** copying the answer or clicking a citation (good), rephrasing right away or asking for a human (bad).
- **A/B tests:** send a slice of traffic to the new version, and compare task success, not just clicks.
- **Sampled judging:** run the judge on a small random sample of live answers each day.

Feed real failures back into the test set.

### S9. Don't fool yourself with noise
Small test sets give noisy numbers.
- With 100 questions, each question is 1 point. A 2-point "gain" can be noise.
- Compare versions on the same questions, and look at which ones flipped.
- Use temperature 0 for evals, or run each case a few times.
- For A/B tests, pick the main metric and the sample size before you start.

### S10. Cost and latency belong in the report
Quality isn't the only number. For every version, record:
- p50 and p95 latency, including time to first token
- cost per question and per 1,000 questions
- refusal rate and error rate

A version that gains 1 point of faithfulness but doubles the cost may not ship. Put everything in one report, so the trade-offs are visible.

### S11. Common eval mistakes
- Tuning on the test set until it scores well, then seeing no gain in production.
- Only testing questions that have answers, so refusals are never checked.
- Trusting an LLM judge that was never compared with people.
- Changing the test set and the system at the same time, so scores can't be compared.
- Reporting one average and hiding a broken slice.

### S12. Interview checklist
When asked "How do you know your RAG system works?", cover:
- A labeled test set with hard cases and no-answer questions
- Separate retrieval metrics (recall@k, MRR) and generation metrics (faithfulness, correctness)
- An LLM judge calibrated against human labels
- Regression gates in CI, plus online signals in production
- Cost and latency next to quality

Saying you evaluate retrieval and generation separately is a strong Senior signal.

## Questions

T7-Q1 · Which half broke
Slide: S1
Answer quality dropped after a release. What's the best first step to find the cause?
- ✓ Check retrieval metrics and generation metrics separately
- Switch to a bigger LLM and see if the quality comes back
- Rewrite the system prompt until the answers look better again
- Ask a few users whether they noticed any change in quality
Key idea: Split the pipeline before you fix it.
Why: Retrieval metrics show whether the right chunks still arrive. Generation metrics show whether the model uses them well.
If wrong (Switch to a bigger LLM and see if the quality comes back): That guesses at a fix. If retrieval broke, a bigger model won't help.
If wrong (Rewrite the system prompt until the answers look better again): Tuning by eye hides the real cause. Measure each half first.
If wrong (Ask a few users whether they noticed any change in quality): That's slow and vague. Your test set tells you which half got worse.

T7-Q2 · MRR (math)
Slide: S4
For three test questions, the first right chunk appears at ranks 1, 2 and 4. What's the MRR?
- ✓ About 0.58
- About 2.33
- About 0.43
- About 1.75
Key idea: MRR averages 1 / rank.
Why: (1/1 + 1/2 + 1/4) / 3 = 1.75 / 3 = about 0.58.
If wrong (About 2.33): That's the average rank. MRR averages 1 / rank.
If wrong (About 0.43): That's 1 / the average rank. Take 1 / rank for each question first.
If wrong (About 1.75): That's the sum. Divide by the 3 questions.

T7-Q3 · Hit rate (math)
Slide: S4
On 200 test questions, a right chunk is in the top 10 for 170 of them. What's hit rate@10?
- ✓ 85%
- 15%
- 17%
- 8.5%
Key idea: Hit rate@k = questions with a right chunk in the top k / all questions.
Why: 170 / 200 = 85%.
If wrong (15%): That's the miss rate: 30 of 200.
If wrong (17%): That divides 170 by 1,000. There are 200 questions.
If wrong (8.5%): That divides by 10 again. The k in @10 doesn't divide the score.

T7-Q4 · Faithful but wrong
Slide: S5
An answer matches a retrieved chunk exactly, but the chunk comes from an outdated policy. How does it score?
- ✓ High on faithfulness, low on correctness
- High on both, since it matches the retrieved text
- Low on faithfulness, since the policy is out of date
- Low on both, since any outdated chunk is a hallucination
Key idea: Faithful means supported by the context; correct means true.
Why: The model stuck to its context, so it's faithful. The context was stale, so the answer is wrong.
If wrong (High on both, since it matches the retrieved text): Matching the context doesn't make it true. The source was stale.
If wrong (Low on faithfulness, since the policy is out of date): It's faithful to what it was given. Retrieval or freshness is the problem.
If wrong (Low on both, since any outdated chunk is a hallucination): A hallucination adds unsupported facts. This one is supported, just stale.

T7-Q5 · Judge likes long answers
Slide: S6
Your LLM judge scores longer answers higher, even when the extra text adds nothing. What should you do?
- ✓ Check it against human labels and tighten the rubric
- Trust it anyway, since longer answers are usually more complete
- Switch to a 1-to-10 scale so it can show finer differences
- Let the judge write the answers too, so the style always matches
Key idea: Calibrate judges against people, and keep rubrics narrow.
Why: Length bias is a known judge bias. Human labels reveal it, and a stricter rubric reduces it.
If wrong (Trust it anyway, since longer answers are usually more complete): That's a known judge bias. Left unchecked, it rewards padding.
If wrong (Switch to a 1-to-10 scale so it can show finer differences): Wider scales are noisier. Narrow rubrics are more reliable.
If wrong (Let the judge write the answers too, so the style always matches): Judges favor their own style. That makes the bias worse.

T7-Q6 · Two points (math)
Slide: S9
Version B scores 2 points higher than version A on a 100-question test set. How many questions is that difference?
- ✓ 2 questions
- 20 questions
- 50 questions
- 0.2 questions
Key idea: On small test sets, a couple of flipped questions can look like a win.
Why: Each question is 1% of 100, so 2 points is 2 questions. Check which ones flipped before claiming a gain.
If wrong (20 questions): That would be 20 points. Each question is 1 point of 100.
If wrong (50 questions): That's half the set, a 50-point change.
If wrong (0.2 questions): Each question is a full point, not a tenth of one.

T7-Q7 · Never refuses
Slide: S11
Spot the flaw: every question in the test set has an answer in the docs. In production, the bot often guesses.
- ✓ No no-answer questions, so refusals were never tested
- The test set is too large and should be cut to 20 questions
- The LLM judge is too strict and should give partial credit
- The docs should be rewritten so every question has an answer
Key idea: Test the cases where the right answer is "I don't know".
Why: If the set never rewards a refusal, nothing pushes the system to refuse when it should.
If wrong (The test set is too large and should be cut to 20 questions): Size isn't the issue. A missing category is.
If wrong (The LLM judge is too strict and should give partial credit): The judge never saw a no-answer case. The test set is the gap.
If wrong (The docs should be rewritten so every question has an answer): Users will always ask things the docs don't cover. Test that case.

T7-Q8 · Hidden slice
Slide: S7
You change the chunk size. Average faithfulness stays flat, but answers about tables get much worse. How should you have caught this?
- ✓ Slice results by question type and check each slice
- Run the same average metric twice to make sure it's stable
- Look only at latency, since quality averages hide nothing
- Raise the overall faithfulness gate from 90% to 99%
Key idea: Averages hide broken slices.
Why: Gains on some question types can cancel a collapse on another. Per-slice checks catch it.
If wrong (Run the same average metric twice to make sure it's stable): A stable average can still hide one broken slice.
If wrong (Look only at latency, since quality averages hide nothing): Latency won't show a quality drop on tables.
If wrong (Raise the overall faithfulness gate from 90% to 99%): A higher overall gate can still pass while one slice collapses.

T7-Q9 · Too-easy questions
Slide: S3
Synthetic questions written from your chunks give recall@10 of 98%, but real users get much worse results. Why?
- ✓ The questions reuse the chunks' wording, so they're easy to find
- Synthetic questions are always too hard for any search to answer
- The LLM that wrote them used too many tokens per question
- Recall@10 can't be measured on questions written by a model
Key idea: Synthetic questions that echo the source make retrieval look too good.
Why: Real users phrase things differently. Questions that copy the chunk's words match it almost trivially.
If wrong (Synthetic questions are always too hard for any search to answer): Here they were too easy. They echoed the text they came from.
If wrong (The LLM that wrote them used too many tokens per question): Token use doesn't change how easy the questions are.
If wrong (Recall@10 can't be measured on questions written by a model): It can. The issue is that these questions aren't realistic.

T7-Q10 · Bad sign
Slide: S8
Which online signal most strongly suggests an answer was wrong?
- ✓ The user rephrases the same question right after
- The user reads the whole answer before leaving the page
- The user's next question is about a different topic
- The answer streamed in under one second
Key idea: Quick rephrasing is a strong "that didn't help" signal.
Why: Users rarely ask again unless the first answer missed. Reading and moving on are neutral or good.
If wrong (The user reads the whole answer before leaving the page): Reading the answer is neutral or a good sign.
If wrong (The user's next question is about a different topic): Moving on usually means the need was met.
If wrong (The answer streamed in under one second): Speed says nothing about whether it was right.
