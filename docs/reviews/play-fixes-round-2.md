# Play fixes, round 2

All six items are on beta. Existing Mock models, interview rubrics, scoring
weights, saved answers and earned progress remain unchanged. No migration or
environment-variable change is needed.

| Item | Change | Main files |
| --- | --- | --- |
| 1 | The disabled submit button says Checking your answer. Play grading uses its own Luna setting, with no reasoning step and a 768-token output budget. The strict prompt, rubric, reference, JSON schema and pass checks are unchanged. | `src/components/play/drill-answer-form.tsx`, `src/lib/play/grader-settings.ts`, `written-grader.ts`, `src/lib/reporting-cost.ts` |
| 2 | Corrected template steps, rather than rounding displayed values after generating the answer. | `src/lib/play/rag/scale-math.ts`, `src/lib/play/content.test.ts` |
| 3 | The flame uses a dedicated orange token instead of the brown warning-text token. Both palettes pass 4.5:1 against the app surfaces. | `src/app/theme.css`, `src/components/play/play.module.css`, `src/lib/theme-palette.test.ts` |
| 4 | Earned badges appear as reward cards with an icon, large name and one sentence on their meaning. No Dismiss button. | `src/components/play/celebration.tsx`, its CSS Module, `badge-rewards.ts`, `game-icons.tsx` |
| 5 | Removed Levels cleared from round results, including placement. The level path remains the record of passes. | `src/components/play/round-summary.tsx`, `tests/e2e/play.spec.ts` |
| 6 | Combined the round, current attempt and outcomes into one owner-scoped query. Added fixed startup timings to the existing server log and Server-Timing response header. | `src/lib/play/round-store.ts`, `round-timing.ts`, `database.ts`, `api.ts`, `rounds.ts`, `src/lib/server-events.ts` |

Server paths without a directory are under `src/lib/play`. UI paths without a
directory are under `src/components/play`.

## Grading

[OpenAI documents Luna](https://developers.openai.com/api/docs/models/gpt-6-luna)
as an efficient model for focused workloads, with structured outputs and
`reasoning.effort: none`. This is a Play-only trial, not a claim of equivalent
quality across all interviews. Mock's configured model and reasoning remain
independent. The existing schema and server checks still require a pass, at least
0.8, a concrete mechanism and an on-topic answer. Vague and off-topic answers
cannot pass by score alone.

The model's published standard token rates are recorded for cost reporting.
Missing or unrecognized usage/pricing stays unavailable, not zero.

The preview tester reported about 4.9 seconds per written submission. A retained
November 12 log at 02:45:59 UTC shows 3,338 ms end to end and a 2,811 ms model
span for Terra, with 392 input tokens, 56 output tokens and no reasoning tokens.
That span includes observation overhead; it is not pure provider compute time.
The owner approved two preview calls after this change, one strong and one vague.
All other verification uses stubs. Two calls provide sanity checks and timings,
not a grading-quality benchmark or a latency percentile.

## Math and saved attempts

New templates use document steps of 1M, question steps of 10K, chunk-volume steps
of 10M, input-token steps of 500, output-token steps of 100 and raw-storage steps
of 20 GB. Existing small integer ranges, embedding dimensions, memory choices and
price increments are kept. Ranges, formulas, tolerance and exact integer checking
are unchanged. Saved attempts retain their original parameters and answer, so
start a new round to see rounded inputs.

## Startup measurements

Retained warm preview logs show 100, 110 and 140 ms of application handling for
round starts. An earlier request took 394 ms. The prior browser observation was
531 ms for the POST and 1,106 ms from its click handler to the displayed drill.
These are different measurements. Browser duration also includes transport,
platform scheduling/startup and, for display time, route rendering.

The read optimization replaces four serial reads of an already-open round view
with one query. Owner checks, private snapshots, timing and retry behavior stay
in the same transaction and under the same per-player lock. The first start
still returns its public question without a follow-up round GET.

The new fixed timing fields mean:

- `guardMs`: configuration, verified sign-in/invite checks and request limits.
- `dbAcquireMs`: pool/connection acquisition and BEGIN.
- `dbLockMs`: owner setting and the per-player advisory lock.
- `dbWorkMs`: round queries, event savepoints and in-transaction application work.
- `dbFinishMs`: transaction completion, including COMMIT or ROLLBACK.
- `app`: total application handling, including response generation and existing logging.

`firstRoundRequest` means the first tracked POST in that function instance.
It does not prove a Vercel cold start. Startup before application invocation and
network time are outside the application clock. Do not attribute that residual
to the database or cold starts without platform evidence. Phase logs contain only
fixed labels, numeric durations and existing request references, never answers,
query values, cookies or secrets. Authentication and request limits are unchanged.

## Verification

Each item runs check and production build. Unit tests keep the strict grader
checks, exercise rounded ranges and verify reward markup, palette contrast,
owner isolation, saved rounds and per-request timing isolation. The browser suite
uses isolated Auth, SQL and model fixtures. It holds a submission to check the
pending button, and captures the flame and reward at 1,440 and 375 pixels in both
themes. Reduced motion remains supported.
