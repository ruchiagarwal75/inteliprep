# GenAI retest 3, 10 November 2026

This work is on beta only. Main, Production, secrets and Vercel environment variables are unchanged. All eleven problem definitions, their private facts, rubrics and weights are unchanged. Existing saved interviews were not modified.

## Changes by item

1. Exhausted discussion banks now request a new question grounded in a real candidate quote and an allowed unresolved stage topic. If the stage has no useful question left, the server may enter the next stage early without awarding coverage. Every delivered reply passes a transcript-wide sentence novelty check. A rejected rewrite receives the exact repeated sentences as retry feedback, and an already sent drawing handoff is not appended again. The old generic drawing fallback is removed.
2. A structured semantic pass checks the full verified candidate evidence, including earlier explanations and stages. It closes answered issues and maps prior questions to canonical issues. Two asks is an interview-wide limit, with legacy per-stage counters still readable. Live RAG salary-file injection and revoke-before-sync cases passed.
3. Diagram labels use plain lowercase words in sentences, without a common-word allowlist or quotation marks. LLM, ACL, API, ID, DB and GPU stay uppercase. All six requested sentences pass for both tracks, including possessives and overlapping labels.
4. Sol grading uses low reasoning and concise evidence-backed feedback. The model, rubric, eligibility rules, full evidence and output budget remain intact. A compact quote-locator index avoids duplicating complete answers in provider input while retaining the full transcript and original displayed evidence. Real server progress frames drive the results steps. Existing JSON callers remain compatible. See the [ten-sample performance report](genai-scorecard-performance-2026-11-10.md).
5. Re-explanation messages can receive one short, quote-grounded acknowledgement of their actual revision. Controls and messages without a concrete change stay quiet. Silent listening turns return only a completed checkpoint, with no repeated waiting text sent to the browser.
6. The full-interview harness uses a separate model candidate with strong, buzzword and weak quality settings. Only the public brief, actual conversation and its own drawing reach that model. Timing and UI controls remain scripted; technical answers and diagram revisions are generated from the real conversation. A separate semantic audit groups delivered technical questions independently of the application's counters. Wrap-up uses the same structured discussion path rather than bypassing topic memory.

The harness also reproduced a transition edge case: Done explaining can enter an already exhausted core stage and immediately leave it. The server now commits those two validated adjacent transitions under the same exclusive lease. This awards no missing-stage coverage and does not widen client authority.

## Scorecard performance and function limits

Ten real grades, two concurrent, completed successfully: p50 **22.75 seconds**, nearest-rank p95 **28.11 seconds**. With ten samples, p95 is the slowest observation. These timings include provider work, parsing and evidence validation, excluding browser, sign-in and Redis transport. The three existing buzzword-v2 grading fixtures still returned No with the faster settings.

The connected project team is on Vercel Hobby. Its Fluid Compute maximum is 300 seconds, so the current 210-second end route fits. Fluid Compute is enabled by default. See [Vercel's duration limits](https://vercel.com/docs/functions/configuring-functions/duration#duration-limits). No plan or dashboard changes were made.

## Verification and reporting boundaries

- Each item is a separate commit followed by npm run check and npm run build.
- The production-build browser suite uses isolated Auth, Postgres and model fixtures, with no OpenAI calls or real saved interviews. All 21 browser checks passed after the engine and progress changes; the final regression run is recorded with the live results below.
- Real provider tests use isolated synthetic server transcripts. The approved simulated clock advances interview stages through 45 minutes; model calls and grading use real elapsed time. The clock is restored before grading to preserve real timeout budgets.
- Estimated app cost includes interviewer, classifier, assessment, rewrite, image and scorecard calls. Candidate-simulator and independent-audit costs are reported separately. Missing usage is unknown, never zero. These are estimates using the repository's model rates, not provider invoices.
- Browser verification exposed an isolated test-fixture protocol mismatch and orphaned Postgres shared-memory resources. Fixtures now understand the new structured requests, and graceful shutdown releases the test database. No saved interview files or production data were deleted.

## Live validation status: incomplete, beta publication approved

The owner approved publishing beta with live validation explicitly incomplete and stopping paid model tests. No further model calls will be made for this round.

The resumed tests exposed and corrected these additional issues:

- A natural When ready, conclude instruction was rejected by the action guard. Clear closing instructions now count as asks, and final closing uses its own structured response with candidate grounding and sentence novelty.
- Exhausting configured probes was treated as exhausting the stage. The engine now attempts a genuinely new boundary from the candidate's actual design, with a separate semantic check against previous asks and answers.
- A third revocation question appeared under a different stage/bank ID. Proposed bank and pending questions now receive a history-based semantic budget check independent of those IDs. The exact failing third question is rejected by a focused live regression. Rejected pending questions retire without assessment credit.
- The first adaptive buzzword actor supplied detailed protocols and failure walkthroughs. Its positive grade did not represent a valid buzzword test. The actor was corrected to stay brief and names-only. Grading criteria, weights and level bars were unchanged.

The final four guarded runs were interrupted by the provider's no-credit 429 response:

| Run | Completed turns | Last simulated minute | Final scorecard and audit |
| --- | --- | --- | --- |
| RAG strong | 21 | 23.5 | Not reached |
| Chat strong | 20 | 22 | Not reached |
| Agent strong | 21 | 23.5 | Not reached |
| RAG buzzword | 33 | 38.5 | Not reached |

No final zero counts, signals, full-interview costs or grading times are claimed for these interrupted runs. Missing usage from failed requests remains unknown.

## Earlier completed runs, before the final history-budget guard

These completed runs are useful evidence, but are not substitutes for the incomplete post-guard acceptance run. The three strong cases passed the expanded independent audit, which includes imperative technical asks and accounts for every ask index. The corrected buzzword candidate received No, but exposed the third-question repetition fixed afterward.

| Run | Repeated sentences | Issues asked more than twice | Canned fallbacks | Signal | Estimated app cost | Grading seconds |
| --- | --- | --- | --- | --- | --- | --- |
| RAG strong | 0 | 0 | 0 | Strong Yes | $1.0323 | 27.53 |
| Chat strong | 0 | 0 | 0 | Yes | $1.0535 | 21.57 |
| Agent strong | 0 | 0 | 0 | Strong Yes | $1.0305 | 16.94 |
| RAG buzzword | 0 | 1 | 0 | No | $0.3400 | 22.90 |

App cost includes measured interviewer, classifier, semantic checks, image and grading calls. Simulator and independent-audit costs are separate testing overhead. Estimates use repository model rates and are not provider invoices. These figures belong to the specific completed synthetic conversations above, not a flat price per interview.

The [full passing strong RAG transcript](genai-retest-3-strong-transcript.md) is included with its successful signal, diagram and scorecard. It predates the final cross-ID history-budget guard and is labeled accordingly. The older [diagnostic transcript](genai-retest-3-diagnostic-transcript.md) is retained as pre-fix, ungraded evidence.

The eleven problem definitions, hidden facts, rubrics, scoring weights and level bars were not changed. Main, Production, secrets and Vercel environment variables were not changed. Real saved interviews were not deleted or migrated.

## Verification

- Full local check: 1,560 tests passed, two existing skips.
- Production-build browser suite: all 21 tests passed.
- Focused real-model checks passed for fresh questions after bank exhaustion, grounded final closing, salary-file injection/revocation memory, and rejecting the actual third revocation ask.
- Ten real grading samples remain successful at p50 22.75 seconds and p95 28.11 seconds. The grader was unchanged during the final history-guard work.
- The four full post-guard live interviews remain unverified because provider credits were exhausted. Paid testing was explicitly stopped by the owner.

The opt-in scripts and archived usage records remain available for future validation with an agreed spend limit. No such restart is authorized by this report.

## Main files

- Question generation and memory: interview-question-budget.ts, design-question-novelty.ts, discussion-closing.ts, fresh-discussion-question.ts, discussion-exhaustion.ts, semantic-topic-memory.ts, topic-memory.ts, genai-probe-memory.ts, unique-interviewer-reply.ts, reply-novelty.ts, llm.ts and interview-turn.ts.
- Labels and revisions: diagram-label-copy.ts, design-update-acknowledgement.ts, chat-response.ts and interview-stream.ts.
- Grading and progress: interview-grading.ts, grading-quote-index.ts, model-settings.ts, grading-progress.ts, grading-response.ts, read-grading-response.ts, the end route, use-interview-end.ts and scorecard-loading.tsx.
- Adaptive benchmarks: tests/live/model-candidate.ts, full-genai-script.ts, full-genai-run.ts, full-genai-finish.ts, full-genai-audit.ts, full-genai-turn.ts and four live entry files. Regression fixtures and unit/browser tests are committed alongside them.

The only additional infrastructure change is graceful shutdown and protocol support in isolated browser fixtures. No application routes, scoring criteria, saved-interview storage or production settings were changed beyond the requested engine and grading behavior.
