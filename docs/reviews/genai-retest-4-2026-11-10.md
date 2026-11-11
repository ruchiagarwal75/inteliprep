# GenAI retest 4, 10 November 2026

This round uses stubbed unit tests and saved retest-3 turn records only. No live model tests, full adaptive interviews, simulators or grading benchmarks were run. Main, Production, Vercel settings, rubrics, facts and scoring weights are unchanged. Saved interviews and previous verification artifacts were not modified.

## Changes

1. **Off-topic filtering:** attack phrases previously matched anywhere, including inside a legitimate security explanation. The filter now recognizes direct requests to the interviewer. The four supplied examples and the original strong RAG answer at minute 38.5 remain eligible on both tracks. Direct instruction and system-prompt attacks still receive the neutral redirect.
2. **Internal identifiers:** pending continuations use the actual pending question rather than interpolating its topic key. An unusable continuation leaves the ordinary ask guard to choose another question. A final buffered delivery boundary rejects `fresh:`, pipes, snake_case and hexadecimal hash-like IDs, including identifiers split across deltas. Stubbed malformed model replies publish no partial text and surface a retryable error.
3. **Wrap-up:** final exhaustion uses the exact question, once: "We're close to time. Is there anything you'd change or add before we wrap up?" No model call generates this closing. Legacy model-generated ending commands are normalized to that invitation. Later final thoughts are saved while the interviewer listens, without repeating the invitation or ordering the candidate to end.
4. **Facts:** requested GenAI fact IDs are filtered against requirements already disclosed in the verified conversation. A mixed answer contains only the new facts. The factual novelty path removes repeated sentences rather than prepending "To confirm," or paying for a rewrite. An all-known request receives a neutral invitation rather than an empty response or another copy of the facts.
5. **Audit:** a pure transcript checker adds internal identifiers, redirects after technical narration, repeated configured facts and command-style wrap-ups. The existing opt-in semantic audit includes these checks too. The separate offline runner imports no model caller and reads only the saved retest-3 delivered-turn records.
6. **Test credentials:** the opt-in live runner installs `OPENAI_TEST_KEY` before test imports and refuses to fall back to `OPENAI_KEY`. Missing or blank test keys clear the inherited app key and fail setup. Normal unit tests clear the app key and use stubs. Unit tests cover separate-key precedence, missing/empty/whitespace values, and secret-free errors. This is deliberately stricter than optional fallback so an accidental live invocation cannot reuse the app credential. Only a blank example entry and test documentation were added; `.env.local` and Vercel values were not changed. Key selection does not set a provider spending limit.

## Offline historical findings

Command executed, with both provider-key variables empty:

```sh
npx vitest run --config vitest.audit.config.mts
```

The audit examined **47 transcript files**, representing **417 distinct recorded turn observations** after deduplicating copied progress, failure and result records.

| Finding | Deduplicated observations |
| --- | ---: |
| Internal identifiers in replies | 2 |
| Neutral redirect after on-topic technical narration | 1 |
| Re-sent configured facts | 5 |
| Order-like wrap-ups | 14 |

Examples:

- The completed strong RAG record at minute 38.5 contains the adversarial evaluation answer, followed by "Let's stay on your design."
- The RAG record at minute 43 and an archived agent record at minute 17.5 interpolate a `fresh:` key into a pending-question fallback.
- Repeated facts include RAG document count and agent permissions or step limits, sometimes behind "To confirm,".
- Closing commands appear in several saved chat, RAG and agent attempts, including "Conclude the interview when ready" and "End the interview when ready".

These are findings in the original historical data, not failures produced by running the newly fixed engine. The files remain intact. Finding categories can overlap on one turn, and the counts are not counts of independent interviews or people.

The offline audit matches configured fact values after whitespace, quote and case normalization. It does not detect every paraphrase. Redirect flags require technical narration and are evidence for review, not a model-based semantic judgment. Diagnostic provider-request logs are excluded because they are not delivered chat transcripts. No semantic model audit was executed.

Detailed findings are saved locally in `artifacts/genai-retest-4/saved-transcript-audit.json`, outside Git.

## Verification

Each item has its own beta commit, with `npm run check` and `npm run build`. The normal check runs TypeScript, ESLint, formatting and stubbed tests. Provider-key variables are cleared for these commands. The production build also verifies that private facts and rubrics are absent from browser chunks.

- Item 1: 1,567 tests passed, two existing skips; production build passed.
- Item 2: 1,574 tests passed, two existing skips; production build passed.
- Item 3: 1,576 tests passed, two existing skips; production build passed.
- Item 4: 1,579 tests passed, two existing skips; production build passed.
- Item 5: 1,582 tests passed, two existing skips; production build passed.
- Item 6: 1,587 tests passed, two existing skips; production build passed. Key-selection and provider-client tests construct no real requests.
- The audit's focused unit tests and saved-record runner passed without model calls.

## Main files

- `src/lib/off-topic.ts` and its regression fixture/tests.
- `src/lib/pending-question-reply.ts`, `public-interviewer-reply.ts` and `llm.ts`.
- `src/lib/discussion-closing.ts` and `docs/spec.md`.
- `src/lib/genai-fact-router.ts` and `unique-interviewer-reply.ts`.
- `src/lib/transcript-audit.ts`, `tests/audit/genai-saved-transcripts.audit.ts`, `vitest.audit.config.mts`, and the existing opt-in audit adapters.
- `tests/helpers/test-model-key.ts`, `tests/live/setup.ts`, both Vitest runner configurations, `.env.example`, `CLAUDE.md` and `docs/problem-catalog.md`.

No additional product features or storage migrations were introduced. Live-model behavior is intentionally not re-benchmarked in this round.
