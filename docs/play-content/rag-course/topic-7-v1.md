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

#### Deep dive: Separate finding evidence from writing a supported answer
A single overall quality score can hide the stage that broke. Ingestion may lose table headings, retrieval may miss an exception, or generation may invent a detail despite receiving the right passage.

Evaluate the pipeline at useful boundaries. Check whether the source was ingested correctly, whether the needed evidence reaches candidates and context, and whether the final answer is correct and supported. Keep the same question and source versions across these checks.

For a contractor chair question, a retrieval miss and an unsupported answer may look identical to the user. The fixes differ. Better generation cannot reliably repair a missing exclusion; better retrieval cannot guarantee the model follows it.

Use a small reviewed set first, with answerable and unanswerable questions. Include permission cases separately because one leak can matter more than a small average quality gain.

When a change improves an end-to-end score, inspect which stage improved and which slices regressed. This helps you keep the gain without silently trading away safety or freshness.

### S2. Building a test set
Start with 100 to 300 real questions. Give each one:
- the IDs of the right chunks, for retrieval
- a reference answer or key facts, for generation

Good sources: real user logs (with personal data removed), support tickets, and questions written by domain experts.

Include hard cases: questions the docs can't answer, multi-part questions, questions that need the newest version, and restricted content. Keep a held-out set that you never tune against.

#### Deep dive: Build an evaluation case that can be reproduced
An evaluation case needs more than a question and a sample answer. Record the relevant source version, supporting passage IDs, expected claims, answerability and the user's permission context.

For "Can contractors claim chairs?", the label should identify the furniture exclusion and the applicable audience. If the source changes, you can tell whether the answer is wrong or the test is stale.

Include different question types and difficult slices: exact identifiers, tables, multi-source comparisons, missing evidence, conflicting versions and restricted documents. Balance common user tasks with high-impact edge cases.

Keep development and held-out cases separate. Repeatedly tuning a prompt against the same examples makes the measured result less representative. Group near-duplicate documents or queries so they do not leak across the split.

Use clear labeling instructions and review disagreements. Two human reviewers may interpret a vague policy differently. That disagreement is useful evidence that the task or source needs clarification, not a reason to pretend the gold answer is perfectly objective.

### S3. Synthetic questions
When real questions are scarce, an LLM can write them from your chunks: "Write a question this paragraph answers."
- Fast and cheap, even for thousands.
- But they tend to reuse the chunk's own words, so retrieval looks easier than it really is.
- Fix: ask for paraphrased, realistic questions, and mix in real ones.
- Review a sample by hand before trusting the set.

#### Deep dive: Synthetic examples help coverage but can make the test too easy
A model can generate questions from source passages to expand an evaluation set. This is useful for coverage, but the questions may copy source wording and be easier to retrieve than real user questions.

For example, a source heading "Contractor furniture exclusion" may generate a question using those exact words. A real user may ask "Can I expense my desk?" The synthetic set can overstate both keyword and semantic retrieval quality.

Generate variations, then review answerability and evidence with independent labels. Add real, privacy-safe user questions and difficult no-answer cases. Do not assume a generated reference answer is correct merely because it was produced from a document.

Keep the source versions and generation method so cases can be audited. Avoid training and evaluating on near-identical generated questions from the same source family.

Use synthetic cases to propose tests, not to certify the system alone. Measure performance separately on synthetic and human-written slices so an easy generated majority does not conceal real-world failures.

### S4. Retrieval metrics
- **Recall@k:** of the right chunks for a question, the share found in the top k. With one right chunk per question, this equals hit rate@k.
- **Precision@k:** of the top k, the share that are right.
- **MRR:** 1 / rank of the first right chunk, averaged over questions. Rank 1 scores 1.0; rank 4 scores 0.25.
- **nDCG@k:** like MRR, but it handles many right chunks and graded relevance.

Retrieval metrics need no LLM, so they're fast and cheap to run on every change.
Diagram: a ranked list of 5 result boxes, numbered 1 to 5. Box 2 is gold and labeled "Right chunk". On the right: "Hit@5: yes" and "Reciprocal rank: 1/2 = 0.5".

#### Deep dive: Know what each retrieval metric divides by
Suppose a question has three labeled relevant passages: A, B and C. The top five results contain A and C plus three irrelevant passages. **Precision@5** is 2/5. **Recall@5** is 2/3. Different denominators answer different questions.

**Hit rate@5** gives this question a hit because at least one relevant passage appears. Across ten questions, seven with a hit produce a 70% hit rate. It does not mean 70% of all relevant passages were retrieved.

**Reciprocal rank** is 1 divided by the first relevant result's rank. If the first relevant passage is third, the value is 1/3. **MRR** averages this across questions, with zero when no relevant result appears within the evaluated range.

**Normalized discounted cumulative gain**, or NDCG, rewards highly relevant results near the top using graded labels and a discount for lower positions. It compares the observed ranking with an ideal ranking under those labels. State the cutoff and relevance scale.

Choose metrics that match the task. One useful passage may suffice for a lookup; a comparison may need several. Keep no-answer queries separate when recall has no relevant-document denominator. Incomplete labels can also make a good newly found passage look falsely irrelevant.

To locate a pipeline bottleneck, count every answerable question through the same funnel. If 8 of 10 have indexed evidence, 6 retrieve it and 5 receive supported answers, end-to-end success is 5/10. Generation succeeds on 5/6 of the retrieved cases. Reporting only that conditional rate hides the earlier losses.

Diagram: eval-case

### S5. Generation metrics
- **Faithfulness:** are the answer's claims supported by the retrieved context?
- **Answer relevance:** does it answer the question that was asked?
- **Correctness:** does it match the reference answer or key facts?
- **Citation accuracy:** do the cited chunks support their sentences?
- **Refusal accuracy:** does it say "I don't know" when the docs lack the answer, and only then?

Faithful isn't the same as correct. An answer can faithfully repeat an outdated chunk and still be wrong.

#### Deep dive: A correct answer can still have weak support
Answer evaluation needs separate labels for correctness, support and completeness. A model might answer correctly from general knowledge while citing an irrelevant passage. That is not reliable grounding for private or changing policies.

Conversely, an answer may faithfully repeat an outdated policy and be wrong for today's question. Track the applicable source version so you can distinguish generation error from stale evidence.

For a multi-part question, check each requested part. "Contractors have an allowance" misses a question about furniture exclusions even if the sentence is true. A short answer can score well only if it covers the required decision and qualifiers.

Evaluate citation existence, claim support and source coverage. A citation count alone cannot show whether claims are supported. Include safe abstention when permitted evidence is insufficient.

Keep a small rubric with concrete examples of partial and incorrect answers. Human reviewers and automated judges need the same distinctions. Report the separate dimensions rather than collapsing every failure into a vague quality score.

### S6. LLM as a judge
Grading thousands of answers by hand doesn't scale, so teams use an LLM judge.
- Give it a narrow rubric, and ask for a score plus a one-line reason. For example: "Is every claim supported by the context? Yes or no."
- Prefer yes/no or 1-to-3 scales over 1-to-10. They're more consistent.
- Known biases: it favors longer answers, its own style, and whichever option comes first.
- Calibrate: have people label 50 to 100 cases, and check how often the judge agrees before you trust it.
Diagram: "Question + context + answer" and "Rubric" both feed a gold "Judge LLM" box, which outputs "Score + reason". Beside it, "Human labels" and the judge's scores feed an "Agreement: 90%" box.

#### Deep dive: Treat an automated judge as a measurement tool with errors
A language-model judge scores outputs using instructions and examples. It can assess semantic support more flexibly than exact string matching, but it is not an independent source of truth.

Judges may prefer fluent, longer answers, overlook subtle exceptions or favor a familiar style. They can also be influenced by instructions hidden inside the answer being judged. Treat the candidate answer and retrieved evidence as untrusted data.

Calibrate the judge against a reviewed human-labeled set. Measure agreement, missed unsafe answers and false failures by task slice. Inspect disagreements rather than choosing a judge because its scores seem plausible.

Use stable judge instructions and record versions. Changing the judge can change reported quality even when the product has not changed. Compare systems with the same judge and cases when possible.

For critical permission tests, use deterministic assertions alongside semantic judgment. An automated judge should not be the only control deciding whether forbidden text leaked. Sample production cases with appropriate access and privacy limits for continued human review.

### S7. Regression gates
Run the eval set on every meaningful change: prompt, model, chunking, embeddings, re-ranker.
- Track each metric over time, per change.
- Gate releases in CI: for example, block if faithfulness drops more than 2 points or recall@10 falls below a floor.
- Read the failed cases, not just the averages.
- Slice by question type: lookups, multi-part, no-answer, recent changes. One average can hide a broken slice.
Diagram: three pairs of horizontal bars, "Before" and "After". "Recall@10: 92% to 93%" (fine). "Faithfulness: 95% to 91%" in red with a gold stamp "Gate: blocked". "Latency p95: 1.2 s to 1.2 s" (fine).

#### Deep dive: Make release gates reflect the errors you cannot accept
A regression gate is a repeatable check a change must pass before rollout. It connects evaluation results to a release decision rather than merely generating a report.

Define the cases, source versions, metrics and acceptance thresholds. Some checks are hard boundaries, such as no cross-user document leakage. Other checks can allow a measured quality or latency tradeoff within an agreed budget.

Compare the new and current versions on the same questions. Inspect slices such as tables, languages, no-answer queries and revoked access. A small overall gain does not excuse a serious regression hidden in a rare slice.

Keep the held-out set separate from the examples repeatedly used for prompt tuning. Add newly discovered production failures to a reviewed regression set without pretending the expanded set is directly comparable to an older score.

When a gate fails, review the cause or roll back. Avoid changing thresholds just to pass a preferred release. A useful gate records why a tradeoff was accepted and who owns the resulting risk.

### S8. Online evaluation
Offline sets get stale. Watch real traffic too:
- **Explicit feedback:** thumbs up or down, and "report a wrong answer".
- **Behavioral signals:** copies, citation clicks and follow-ups are clues, not proof of correctness or failure.
- **A/B tests:** send a slice of traffic to the new version, and compare task success, not just clicks.
- **Sampled judging:** run the judge on a small random sample of live answers each day.

Feed real failures back into the test set.

#### Deep dive: Behavior is a clue; it is not proof that an answer was right
Offline evaluation measures controlled cases. Online evaluation asks whether the product helps real users under actual traffic. Both matter, and they measure different things.

Clicks on citations, copied answers and follow-up questions are behavioral signals. A citation click may mean curiosity or suspicion. Copying an answer does not prove it is correct. A follow-up may show productive exploration rather than failure.

Use explicit feedback and reviewed samples where appropriate. For an experiment, assign users or sessions consistently and choose a primary outcome plus safety and service guardrails. Avoid comparing a new version during quiet hours with an old version during peak traffic.

Track answerability, errors, latency and cost alongside satisfaction. A system that refuses almost everything may avoid bad answers while being useless. A confident system may get positive reactions before users discover incorrect details.

Protect private text when sampling. Keep access-controlled, minimized evidence and a retention policy. Online learning should improve the product without turning every question and answer into unrestricted analytics data.

### S9. Don't fool yourself with noise
Small test sets give noisy numbers.
- With 100 questions, each question is 1 point. A 2-point "gain" can be noise.
- Compare versions on the same questions, and look at which ones flipped.
- Use low temperature to reduce sampling variation, but do not assume deterministic results. Repeat cases when variation could change the release decision.
- For A/B tests, pick the main metric and the sample size before you start.

#### Deep dive: Compare the same cases and look at the uncertainty
A small evaluation set can swing from a few changed answers. If a system improves from 80 to 82 correct out of 100 questions, that difference alone does not prove a stable gain.

Use paired comparisons: run both versions on the same questions and inspect which cases changed. Report uncertainty with an appropriate interval or resampling method rather than presenting every percentage point as exact.

Separate randomness from systematic failure. Repeat selected cases when generation is variable, but do not keep rerunning only the failures until a version looks good. Fix the procedure before comparing results.

Keep important slices visible. A large easy-query majority can hide a regression on rare, high-impact policy questions. Report counts as well as rates so a 100% result on two cases is not mistaken for strong evidence.

Use evaluation to decide what to investigate next. When the observed gain is uncertain, gather more representative labels or simplify the change rather than claiming a precise improvement the sample cannot support.

### S10. Cost and latency belong in the report
Quality isn't the only number. For every version, record:
- p50 and p95 latency, including time to first token
- cost per question and per 1,000 questions
- refusal rate and error rate

A version that gains 1 point of faithfulness but doubles the cost may not ship. Put everything in one report, so the trade-offs are visible.

#### Deep dive: Compare quality, cost and latency under the same conditions
A release can improve answer quality while making the system too slow or expensive. Measure the full request, including query rewriting, retrieval, reranking, generation, verification and retries.

Report latency distributions such as p50 and p95, not only an average. Include peak concurrency, input lengths and cache conditions. A warm-cache single-user result does not describe first-time requests under load.

Cost per answer should include every model call with known usage. Separate missing usage from zero cost. Also distinguish cost per request from cost per successful, supported answer.

Use the same case set and workload to compare versions. If a new context strategy sends fewer tokens but omits exceptions, it is not a straightforward efficiency win. Show the quality change beside the token savings.

Set service and budget guardrails alongside quality gates. A useful report lets you see whether the chosen operating point fits the product, rather than hiding tradeoffs behind one overall score.

### S11. Common eval mistakes
- Tuning on the test set until it scores well, then seeing no gain in production.
- Only testing questions that have answers, so refusals are never checked.
- Trusting an LLM judge that was never compared with people.
- Changing the test set and the system at the same time, so scores can't be compared.
- Reporting one average and hiding a broken slice.

#### Deep dive: Check whether the benchmark rewards the behavior you need
An evaluation can look strong for the wrong reason. Easy questions, copied source wording, stale references and leaked training examples all inflate confidence without proving the product works.

Inspect the denominators. Hit rate asks whether at least one relevant result appears; recall asks how much labeled evidence was found. Calling one metric by another name changes what the score appears to mean.

Include no-answer cases and permission failures. A test set containing only answerable public questions cannot measure safe abstention or access isolation. A model that always answers may look excellent on that restricted benchmark.

Freeze a held-out set before tuning and track source versions. If every prompt change is optimized against the same hundred questions, improvement can reflect memorization of the test rather than better general behavior.

Finally, inspect concrete outputs. Metric summaries are useful for trends, but a few traceable failures often reveal a missing exception, a bad chunk boundary or a permission bug that an aggregate number obscures.

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
