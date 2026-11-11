# GenAI scorecard performance, 10 November 2026

Beta-only retest. Main, Production, secrets and deployment environment variables were not changed. Rubrics, problem configurations, scoring weights and eligibility rules are unchanged.

## Ten real grading samples

We measured ten Senior grades: four RAG, three chat and three agent cases, with two requests running concurrently. Inputs are three fixed, long synthetic transcripts: RAG comes from the first 32-turn adaptive run, and chat and agent from the previous full benchmark. The RAG case reproduces the real grading-input overflow found in this retest. These are grading fixtures, not the adaptive candidate tests. Every grading call used the real Sol provider, strict structured output and low reasoning.

| Measure | Seconds |
| --- | --- |
| p50, median of the two middle samples | 22.75 |
| p95, nearest rank | 28.11 |
| Successful grades | 10 of 10 |

With ten samples, nearest-rank p95 is the slowest observation. The timer covers gradeInterview, provider time, parsing and evidence validation. It excludes browser transport, sign-in and Redis publication. This is a small local measurement cohort, not a production latency guarantee. The final cohort ran alongside the adaptive interviews. Cache usage and all per-call tokens are preserved in the local artifact.

| Sample | Problem | Seconds |
| --- | --- | --- |
| 1 | enterprise-rag-assistant | 22.31 |
| 2 | ai-chat-assistant | 22.58 |
| 3 | tool-using-ai-agent | 24.28 |
| 4 | enterprise-rag-assistant | 20.67 |
| 5 | ai-chat-assistant | 22.93 |
| 6 | tool-using-ai-agent | 23.55 |
| 7 | enterprise-rag-assistant | 19.60 |
| 8 | ai-chat-assistant | 23.35 |
| 9 | tool-using-ai-agent | 28.11 |
| 10 | enterprise-rag-assistant | 20.99 |

## Changes and quality checks

- Interactive grading defaults to low reasoning and caps older high-effort settings at low. The configured model and 16,000-token output budget remain unchanged. Lower reasoning is a documented latency control in the [official OpenAI reasoning guide](https://developers.openai.com/api/docs/guides/reasoning).
- The full transcript is retained. A compact quote-locator index removes repeated answer text from provider input; the server still attaches the original full quotes. A regression test confirms that the formerly oversized adaptive transcript fits the unchanged 128 KB model text cap.
- Concise findings and the strongest evidence IDs reduce repeated prose. The grader still receives the full transcript, diagram, private rubric, level bar and counter-evidence instructions.
- The three unchanged Senior buzzword-v2 fixtures all returned No with the faster settings. New rationales remain under 30 words. No rubric or calibration threshold was relaxed.
- Server progress reports evidence reading, feedback writing and evidence checking. The UI does not advance steps on a timer. JSON API callers remain compatible; clients requesting NDJSON get progress frames and a final body with the original application status.
- A delayed grading lifecycle test confirms the shared owner lease remains held after headers return, then releases after completion. Cancellation aborts work; malformed or truncated streams retain a friendly retry path.

## Vercel duration

The connected Vercel deployment context identifies the project team as Hobby. With Fluid Compute, enabled by default, Hobby allows a maximum function duration of 300 seconds. The current 210-second end route is within that limit, leaving 90 seconds of plan headroom. See the [official Vercel duration limits](https://vercel.com/docs/functions/configuring-functions/duration#duration-limits). No plan upgrade or dashboard change is required.

The app retains defensive bounds of 180 seconds for GenAI provider work, 195 seconds for the browser, 210 seconds for the route and 240 seconds for the shared lease. The observed target is under 60 seconds, rather than a new 60-second cutoff that could discard slow feedback.

## Reproduction

```bash
node --env-file=.env.local node_modules/vitest/vitest.mjs run --config vitest.genai.config.mts --maxConcurrency=2 tests/live/genai-grading-speed.live.ts
node --env-file=.env.local node_modules/vitest/vitest.mjs run --config vitest.genai.config.mts tests/live/genai-grading-quality.live.ts
```

The ten inputs are committed in tests/fixtures/genai-grading-performance.json. Detailed measurements are in the ignored artifacts/genai-retest-3/grading-speed.json file. Quality results are in the same artifact directory.

## Browser fixture cleanup

The repeated browser runs exposed orphaned macOS shared-memory segments belonging
to dead isolated Postgres fixtures. Cleanup matched the repo-owned fixture data
directory, test port, dead process ID, segment ID and creator before removal.
No saved interviews or production databases were touched. Playwright now sends
a graceful termination signal and the fixture shutdown is idempotent, allowing
Postgres to release its resources before the test process exits.
