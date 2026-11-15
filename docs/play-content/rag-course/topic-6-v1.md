# Topic 6: Generation, v1 (new topic)

Slide bodies support short paragraphs, bullet lists and numbered lists. Keep the wording as written.
Diagrams: clean vector SVG, Inter, theme colors, square boxes, clear arrows. Landscape at desktop (max 200 px tall), portrait below 600 px wide. Gold marks the thing to notice.

## Slides

### S1. What generation has to get right
The LLM turns the question and the context into the final answer. A good RAG answer is:
- **Faithful:** every claim is supported by the retrieved context.
- **Relevant:** it answers the question that was asked.
- **Complete enough:** it covers what the sources say, and no more.
- **Cited:** a user can check each claim.
- **Fast:** text starts appearing quickly.

Generation can't fix bad retrieval, but it can ruin good retrieval.

#### Deep dive: Judge the answer on several separate obligations
A useful RAG answer must address the question, stay supported by evidence and preserve the details needed for a decision. These obligations can fail independently.

For "Can contractors claim chairs?", "Contractors have an equipment allowance" may be relevant and grounded in one sentence, yet incomplete if it omits the furniture exclusion. "No, because furniture is excluded" can be correct and useful if the current permitted policy supports it.

**Faithfulness** asks whether claims follow from supplied evidence. **Correctness** asks whether the answer is actually right for the task. An answer can faithfully repeat an obsolete policy and still be wrong. **Completeness** asks whether it covers the required parts and exceptions.

Use labeled examples that distinguish these failures. Do not award full credit merely because the answer contains a citation or sounds fluent. A citation may point to related text that does not support the claim.

The generator needs selected evidence and clear instructions, but evaluation must check the final claims. Decide which errors require abstention, correction or human review based on their impact.

### S2. Choosing and routing models
- **Quality:** reasoning, following instructions, and sticking to the context.
- **Latency:** time to first token and tokens per second.
- **Cost:** price per input and output token.
- **Context window and data rules:** hosted API or self-hosted.

A common pattern: a router sends easy questions to a small, fast model and hard ones to a large model. Test both on your own question set.
Diagram: "Question" into a "Router" box. Two arrows out: the top one to "Small model" (label "80% of questions, fast and cheap"), the bottom one to a gold "Large model" (label "20%, multi-step"). Both into "Answer".

#### Deep dive: Route by measured task needs and include the routing mistakes
Model selection is a quality, latency and cost decision. A larger model may handle complex evidence better, but it cannot recover a missing source or repair an authorization failure.

Compare candidates on representative tasks: a direct policy lookup, a multi-source comparison, a conflicting-version case and a no-answer question. Include support and citation quality, not just writing style.

Routing can send simple cases to a cheaper model and difficult cases to a stronger one. The router itself can make mistakes. If it labels a subtle exception as easy, the system may fail exactly where quality matters most.

Define a fallback triggered by observable checks, such as incomplete source coverage or invalid output. Bound retries and escalation so one difficult request cannot call several expensive models indefinitely.

Measure end-to-end cost per successful answer, including router calls, retries and verification. A lower price per token can still cost more if it requires longer prompts or frequent retries. Keep the chosen model and routing version in safe trace metadata for regression analysis.

### S3. Sampling settings
- **Temperature:** changes how strongly sampling favors likely tokens. Lower settings reduce variation; supported ranges depend on the model.
- **Top-p:** samples within a set reaching a chosen cumulative probability. Usually tune temperature or top-p, not both.
- **Max output tokens:** caps length and cost. Set it per use case.
- **Stop sequences:** end the output cleanly at a marker.

Low temperature reduces randomness, but it doesn't stop hallucination. Grounding and good context do.

#### Deep dive: Sampling controls variation, not factual access
A generative model assigns scores to possible next tokens. **Temperature** changes how sharply sampling favors the highest-scoring choices. Lower settings generally reduce variation; higher settings spread probability more widely. Exact behavior and supported ranges depend on the model.

**Top-p**, or nucleus sampling, limits choices to a set whose cumulative probability reaches a configured amount. It controls the candidate set rather than directly checking facts. Some models expose only part of this sampling configuration.

If the context says furniture is excluded, a lower-temperature answer may phrase that rule more consistently. If the exclusion is missing, lower temperature can produce the same unsupported answer repeatedly. Deterministic-sounding output is not proof of truth.

Choose settings on evaluated tasks and keep them fixed while comparing other changes. Test answer completeness, support and valid formatting. Avoid tuning several settings at once without a clear comparison.

For factual tasks, evidence selection and support checks usually matter more than trying to eliminate hallucinations through sampling settings. Use variation when the product needs it, not as a substitute for a safety or correctness boundary.

### S4. Hallucination in RAG
Even with good context, a model can:
- Add facts that aren't in the documents, often from its training data.
- Blend two chunks into one wrong combined claim.
- Answer confidently when the context doesn't cover the question.

Defenses: strict grounding rules, an "I don't know" path, citations, and a faithfulness check. Measure the hallucination rate on a question set. Don't assume it's zero.

#### Deep dive: Locate unsupported claims before changing the model
In RAG, a hallucination is often an unsupported claim in the final answer. Its source can be earlier than generation: missing evidence, an obsolete document, a lost exception or a wrong summary.

Trace the specific claim. If retrieval found only the employee allowance, the generator may incorrectly generalize it to contractors. If context compression removed "furniture excluded", the original passage was good but the final evidence was incomplete.

If the complete exception reaches the prompt and the model still says chairs are allowed, inspect generation, instructions and claim verification. Each failure suggests a different fix. Increasing model size first can mask a retrieval defect without removing it.

Build answerable and unanswerable examples with source versions and expected claims. Measure supported-claim rate and the ability to abstain. Check whether partial answers preserve uncertainty instead of filling missing details with plausible guesses.

A safe correction can retrieve additional evidence, narrow the answer or say the available sources do not establish the requested detail. Keep retries bounded and avoid rewriting the same unsupported answer until it merely sounds more convincing.

### S5. Citations you can trust
- Ask the model to cite chunk IDs after each claim: "Refunds take 5 days [2]."
- After generating, verify: does each cited chunk exist, and does it actually support its sentence?
- Drop or flag claims with missing or wrong citations.
- In the UI, link each citation to its source and highlight the passage.

A citation that points to the wrong document is worse than none. It creates false trust.
Diagram: an answer box with two sentences, each ending in a citation marker, [1] and [2]. Arrows lead to two source cards. Card 1 has a green check and the label "Supports the claim". Card 2 has a red X and the label "Says something else".

#### Deep dive: A valid source ID is only the first citation check
Citation validation has several layers. Does the ID exist in the current request's source set? Does the linked passage support the nearby claim? Is it the applicable version? Can the user still open it?

For "Contractors can claim chairs [2]", source 2 might exist but actually exclude furniture. The citation is syntactically valid and semantically wrong. Counting citations would miss this failure.

Split important answers into claims and map each claim to supporting spans. Preserve headings and qualifiers so the checker can interpret the passage. Multi-source claims may need more than one citation.

Render links using trusted source metadata rather than arbitrary URLs generated by the model. Recheck authorization when opening a cited document; permissions may change after answer generation.

For a missing or unsupported citation, correct the claim, find actual support or withhold that part of the answer. Do not attach the nearest-looking passage just to satisfy a citation format. Evaluate support accuracy and coverage separately.

### S6. Checking faithfulness
From cheap to costly:
- **Rules:** verify source IDs, quoted values and units. Check derived numbers against the supporting inputs and arithmetic.
- **Entailment (NLI) model:** a small model checks whether each claim follows from its cited chunk.
- **LLM judge:** a second model compares the answer with the context and flags unsupported claims.

Run every check on your question set, and the costly ones on a sample in production. When a check fails, regenerate, remove the claim, or say you're not sure.
Diagram: "Answer" splits into three "Claim" boxes. Each claim plus its cited chunk goes into a gold "Check" box. Outputs: two "Supported" (green check) and one "Unsupported" (red X) leading to "Remove or regenerate".

#### Deep dive: Check support claim by claim, including valid calculations
A faithfulness check asks whether an answer's claims follow from the supplied evidence. First identify the claims, then compare each with the relevant source span. A fluent overall paragraph can contain one unsupported number or exception.

Some checks are deterministic. Verify source IDs, dates, units and quoted amounts. Other checks need semantic judgment, such as whether a paraphrase preserves "only" or "unless". Natural-language inference models and language-model judges can help, but both make mistakes.

A number need not appear verbatim to be supported. If the source says 50 units per month and the answer correctly calculates 600 per year, verify the arithmetic and the assumption that the rule applies for all twelve months. Rejecting every new number would reject legitimate reasoning.

Use human-labeled support examples to assess false positives and missed errors. Include negation, tables and multiple-source deductions. A judge's explanation is not proof that its decision is correct.

Decide what to do after a failed check: revise a specific claim, retrieve missing evidence or abstain. Bound the correction loop and log safe failure categories for diagnosis.

### S7. Structured output
When the answer feeds code (a form, a ticket, a UI card), ask for JSON that matches a schema.
- Use the provider's structured output or JSON mode when available.
- Validate against the schema. On failure, retry once with the error message.
- Keep fields separate, for example an "answer" string plus a "citations" list of IDs.

Structured output makes citations, confidence and follow-up actions easy to render and test.

#### Deep dive: Valid JSON can contain a false answer
Structured output constrains shape. A schema can require an answer string, a list of source IDs and a status such as "answered" or "insufficient evidence". This makes parsing predictable.

It does not make the content true. A response can be valid JSON while claiming chairs are covered and citing a passage that excludes them. Schema validation and evidence validation are separate checks.

Validate the model output at the network boundary. Reject unexpected fields or invalid IDs as appropriate. Then check source membership, support and any product policies before rendering or acting on the result.

Render strings safely as text. Never turn a model field directly into executable HTML, SQL or an unrestricted URL. If the assistant takes actions, use a separate authorized tool contract rather than trusting a JSON field that says "approved".

Test malformed, truncated, refused and perfectly formatted but unsupported outputs. A useful failure path keeps the user's request and explains that the answer could not be completed, rather than exposing a raw validation error.

### S8. Streaming and latency
Users notice both time to first token and time to a complete answer.

Illustrative budget: rewrite 300 ms + retrieval 50 ms + re-rank 80 ms + the LLM's first token 400 ms = about 830 ms before text appears.

Then tokens stream, for example at 50 per second, so a 300-token answer takes 6 more seconds.

Stream tokens to the UI, show sources early, and keep prompts short. Long prompts slow the first token.
Diagram: a horizontal timeline. Segments: "Rewrite 300 ms", "Retrieve 50", "Re-rank 80", "LLM first token 400". A gold marker at the end of these reads "First word at 830 ms". After it, a long striped segment labeled "Streaming, 6 s".

#### Deep dive: Measure first output and completed answers separately
**Time to first token**, or TTFT, is how long the user waits before generation begins to appear. Full-answer latency includes the remaining output. A fast first word followed by a long stall is still a poor experience.

Streaming can make progress visible while the answer is produced. It also creates a safety decision: some output checks run before any text is shown; others require a completed sentence or answer. Define what can be streamed safely and what must wait.

If the connection drops, give the request a stable ID. The client should know whether it can resume, fetch the completed answer or retry without producing duplicate turns and extra charges.

Measure retrieval, queueing, prefill, decode and network time separately, then report end-to-end distributions. Short benchmark outputs do not represent long answers under peak concurrency.

When a stream fails partway through, mark the answer incomplete and offer a clear retry or continuation. Do not present an unfinished sentence or missing citation as a completed, checked answer.

### S9. Saying "I don't know" well
A good refusal is a feature:
- Say what's missing: "The policy doesn't cover contractors."
- Point to the closest sources or the right team.
- Offer a next step: rephrase, or ask a person.

Track the refusal rate. A rise can come from retrieval misses, outages or stricter policy. A near-zero rate can hide guessing. Diagnose the reason and check both unnecessary refusals and unsupported answers.

#### Deep dive: Explain the limit without revealing protected information
An assistant may be unable to answer because evidence is missing, access is restricted or a dependency is unavailable. Those are different situations and should not all become a confident guess.

If permitted sources do not answer the question, say what is missing and offer a useful next step. For example, "I found the allowance but not an approved furniture rule" is useful when that statement itself is permitted.

Do not reveal that a restricted salary document exists or summarize its title to explain a refusal. Permission handling should avoid exposing protected metadata as well as content.

A service outage should be described as a temporary availability problem, with a retry path when safe. It is not evidence that no policy exists. Keep error categories separate so operations can diagnose the cause.

Evaluate abstention on answerable and unanswerable questions. Too many refusals make a safe system unhelpful; too few create unsupported answers. A good response states the evidence limit plainly and keeps the user moving.

### S10. Cost control
Cost depends on token counts, model prices and extra calls. Long RAG prompts can make input expensive; long answers or high output prices can make output dominate instead.
- Trim the context (Topic 5) and cap max output tokens.
- Cache answers to repeated questions, by exact match or by semantic match with a strict threshold and a short expiry.
- Route simple questions to a small model.
- Use cheaper batch pricing for offline jobs when the provider offers it.

Semantic caching risk: similar questions from different users may need different answers. Put the user's role and permissions in the cache key.

#### Deep dive: Count the entire answer pipeline, including retries
Cost per answer includes more than generation. Embedding a query, rewriting it, reranking passages, verifying claims and retrying failed calls can all add cost.

Use explicit illustrative prices when teaching the calculation. If a request uses 4,000 input tokens at $1 per million and 500 output tokens at $4 per million, generation costs $0.004 + $0.002 = $0.006. These are example rates, not a quoted provider price.

Add retrieval infrastructure and other model calls separately. A second generation attempt roughly adds that attempt's actual usage; a failed call with missing usage is unknown, not automatically free.

Reduce unnecessary work before changing answer quality. Deduplicate context, bound query fan-out, cap output length and cache computation only within valid permission and version boundaries. Test whether a cheaper route preserves important exceptions.

Report average and tail cost per successful answer along with failure rate. An apparently cheap request that often fails or needs manual correction may be the more expensive product choice.

### S11. Guardrails on the output
Before showing an answer, check:
- **Safety and policy:** harmful or disallowed content.
- **Data leaks:** personal data or secrets the user shouldn't see.
- **Format:** valid schema, valid citations and length limits.

Block high-risk failures and explain why. Let low-risk ones through, and log them. Topic 9 goes deeper.

#### Deep dive: Separate policy enforcement from output formatting
Output guardrails can check several risks: unsupported claims, disallowed content, personal data leakage and unsafe links. These checks need different signals and should not become one unexplained "safe" score.

A data-loss check might catch an account number copied from a source. A support checker might catch an invented deadline. HTML encoding prevents a returned string from executing in the browser. None of these replaces document authorization.

Decide which checks must run before streaming. A later detector cannot retract sensitive text the user already saw. For tasks where delayed checks are acceptable, make the incomplete or unverified state clear.

Test false positives as well as misses. A legitimate security lesson may quote an attack phrase; blocking every such phrase prevents useful answers. Use context and policy rather than keyword matching alone.

When a check fails, return a useful safe response or narrow the answer. Keep diagnostic categories and request IDs in logs without copying full private answers into general-purpose logging.

### S12. Interview checklist
When asked "How do you generate a reliable answer?", cover:
- Model choice, and routing by difficulty
- Low temperature plus strict grounding and an "I don't know" path
- Citations, verified after generation
- Streaming, with a budget for time to first token
- Cost controls: trimmed context, output caps, permission-aware caching

Explaining that low temperature doesn't prevent hallucination is a strong Senior signal.

## Questions

T6-Q1 · Temperature myth
Slide: S3
Which statement about temperature in a RAG system is true?
- ✓ Low temperature cuts randomness but doesn't prevent hallucination
- Temperature 0 guarantees the model never makes up any facts
- Higher temperature makes answers more faithful to the context
- Temperature controls how many of the retrieved chunks the model reads
Key idea: Grounding prevents hallucination; temperature only controls randomness.
Why: At temperature 0, a model still confidently repeats whatever it "believes", including facts that aren't in the context.
If wrong (Temperature 0 guarantees the model never makes up any facts): Even at 0, a model can confidently add facts that aren't in the context.
If wrong (Higher temperature makes answers more faithful to the context): More randomness usually means more made-up details.
If wrong (Temperature controls how many of the retrieved chunks the model reads): Temperature shapes token sampling, not which context the model reads.

T6-Q2 · First word (math)
Slide: S8
Query rewrite takes 200 ms, retrieval 60 ms, re-ranking 90 ms, and the LLM's time to first token is 450 ms. About when does the first word appear?
- ✓ About 800 ms
- About 450 ms
- About 350 ms
- About 1,250 ms
Key idea: Time to first token adds up every step before the LLM starts streaming.
Why: 200 + 60 + 90 + 450 = 800 ms.
If wrong (About 450 ms): That's only the LLM. The earlier steps run first.
If wrong (About 350 ms): That stops before the LLM's own 450 ms.
If wrong (About 1,250 ms): That counts the LLM's 450 ms twice.

T6-Q3 · Streaming time (math)
Slide: S8
After the first token, the model streams 40 tokens per second. How long does a 400-token answer take to finish streaming?
- ✓ 10 seconds
- 1 second
- 16 seconds
- 0.1 seconds
Key idea: Streaming time = output tokens / tokens per second.
Why: 400 / 40 = 10 seconds. Shorter answers or faster models cut this directly.
If wrong (1 second): That's 40 tokens, not 400.
If wrong (16 seconds): That multiplies instead of dividing. 400 / 40 = 10.
If wrong (0.1 seconds): That divides 40 by 400. Flip it.

T6-Q4 · Unchecked citations
Slide: S5
Spot the flaw: answers show citations, but nobody checks them. Users find that [3] links to a doc saying the opposite.
- ✓ Citations aren't verified; check that each cited chunk supports its claim
- The citation format is wrong; use numbered footnotes instead of brackets
- Too many citations confuse users, so show only one per answer from now on
- The re-ranker put doc 3 too high, so remove the re-ranking step completely
Key idea: Verify citations after generation.
Why: Models can attach a real ID to an unsupported claim. A support check catches it before users do.
If wrong (The citation format is wrong; use numbered footnotes instead of brackets): The format is fine. The link points to the wrong evidence.
If wrong (Too many citations confuse users, so show only one per answer from now on): Fewer citations doesn't fix wrong ones.
If wrong (The re-ranker put doc 3 too high, so remove the re-ranking step completely): Ranking didn't write the citation. Verify citations after generation.

T6-Q5 · Catch made-up facts
Slide: S6
Which check best catches answers that add facts not found in the retrieved context?
- ✓ An entailment check of each claim against its cited chunk
- A spelling and grammar check on the final answer text
- Comparing the length of the answer with the question
- A tone check that makes sure the answer sounds polite
Key idea: Check claims against sources, not style.
Why: An entailment model or LLM judge asks, per claim, "does the cited text actually say this?"
If wrong (A spelling and grammar check on the final answer text): Spelling can be perfect while the facts are made up.
If wrong (Comparing the length of the answer with the question): Length says nothing about whether claims are supported.
If wrong (A tone check that makes sure the answer sounds polite): A polite answer can still be wrong.

T6-Q6 · Routing
Slide: S2
80% of questions are simple lookups, and 20% need multi-step reasoning. How do you cut cost without hurting quality?
- ✓ Route easy questions to a small model and hard ones to a large one
- Send everything to the small model and accept worse answers on hard ones
- Send everything to the large model, but at a lower temperature
- Answer easy questions from the model's memory, with no retrieval
Key idea: Match model size to question difficulty.
Why: Most traffic gets cheap, fast answers, and hard questions still get the strong model.
If wrong (Send everything to the small model and accept worse answers on hard ones): The 20% of hard questions get worse. Route instead.
If wrong (Send everything to the large model, but at a lower temperature): Temperature doesn't change the price. You still pay large-model rates for easy questions.
If wrong (Answer easy questions from the model's memory, with no retrieval): Simple lookups still need your documents. The model has never seen them.

T6-Q7 · Shared cache
Slide: S10
Spot the flaw: a semantic cache returns a stored answer when a new question is 95% similar. A contractor gets the answer meant for full-time employees.
- ✓ The cache key ignores who's asking; add role and permissions to it
- The threshold is too low; only exact 100% matches should ever be served
- Caching should never be used in a RAG product of any kind
- The embedding model needs more dimensions to tell them apart
Key idea: Cache keys must include the user's scope.
Why: The questions really are near-identical. The users aren't, so the key must include role and permissions.
If wrong (The threshold is too low; only exact 100% matches should ever be served): Exact matches still leak across roles. The key must include who's asking.
If wrong (Caching should never be used in a RAG product of any kind): Caching is fine when the key includes scope and entries expire quickly.
If wrong (The embedding model needs more dimensions to tell them apart): Better vectors won't help. The questions are the same; the users differ.

T6-Q8 · Who pays more (math)
Slide: S10
Each answer uses 5,000 input tokens at $3 per million and 400 output tokens at $15 per million. About what share of the cost per question is input?
- ✓ About 70%
- About 93%
- About 50%
- About 30%
Key idea: In RAG, long context makes input the bigger cost, even though output tokens cost more each.
Why: Input is 5,000 x $3 / 1M = $0.015. Output is 400 x $15 / 1M = $0.006. $0.015 / $0.021 = about 70%.
If wrong (About 93%): That's the share of tokens. Output tokens cost 5x more each.
If wrong (About 50%): Input is $0.015 and output is $0.006. They're not equal.
If wrong (About 30%): That's the output share. Input is $0.015 of $0.021.

T6-Q9 · UI card
Slide: S7
Your answer feeds a UI card with a summary and a list of citation IDs. What's the most reliable approach?
- ✓ Ask for JSON that matches a schema, validate it, retry once on failure
- Ask for plain text and pull out the parts with regular expressions
- Ask for JSON, and if it breaks, show the raw model output to the user
- Make two separate calls, one for the summary and one for the citations
Key idea: Schema plus validation plus one retry.
Why: A schema makes the output predictable, validation catches breaks, and a retry with the error usually fixes them.
If wrong (Ask for plain text and pull out the parts with regular expressions): Free text varies too much. Parsing breaks on small wording changes.
If wrong (Ask for JSON, and if it breaks, show the raw model output to the user): Users would see broken JSON. Validate and retry instead.
If wrong (Make two separate calls, one for the summary and one for the citations): That's twice the cost, and the citations may not match the summary.

T6-Q10 · Rising refusals
Slide: S9
Over a month, the bot's "I don't know" rate jumps from 5% to 25%. What should you check first?
- ✓ Whether retrieval is missing documents, such as a broken ingestion job
- Nothing: the LLM simply became more honest on its own, so leave it alone
- Whether users started asking much easier questions than before
- Whether the temperature setting drifted higher during the month
Key idea: A refusal spike usually means the context got worse, not the model.
Why: When documents stop reaching the index or the prompt, the model correctly says it can't answer.
If wrong (Nothing: the LLM simply became more honest on its own, so leave it alone): Models don't change on their own. Something upstream changed.
If wrong (Whether users started asking much easier questions than before): Easier questions would lower the refusal rate, not raise it.
If wrong (Whether the temperature setting drifted higher during the month): Settings don't drift by themselves. Check retrieval and ingestion first.
