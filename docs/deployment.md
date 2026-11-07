# Vercel private beta

The Vercel project is `inteliprep` in `ruchiagarwal75s-projects`:
[project dashboard](https://vercel.com/ruchiagarwal75s-projects/inteliprep).
It uses Node 24 and Vercel Authentication for all deployments, including Production domains. The local
`.vercel/project.json` records its project/workspace IDs and stays gitignored.
The existing beta URL is
[the protected interview app](https://inteliprep-ruchiagarwal75s-projects.vercel.app/interview).

## Custom domain

`mockmeai.com` serves the protected Production deployment of the same Vercel
project. `www.mockmeai.com` redirects to `mockmeai.com` with HTTP 308. Vercel
Authentication remains enabled for All Deployments; this is a private release.

DNS is hosted at GoDaddy. Vercel's domain configuration is the source of truth for
the required A and CNAME records; check it before updating the zone. Preserve MX,
TXT, nameservers, and unrelated records. After DNS changes, verify both hostnames,
HTTPS, the www redirect, signed-out protection, and an authorized `/api/health`.

Supabase Site URL is `https://mockmeai.com`, with
`https://mockmeai.com/auth/callback` allowed alongside the existing localhost and
Vercel beta callbacks. The Google-to-Supabase callback remains unchanged.
Browser interview history remains on the hostname where it was saved; switching
to the custom domain does not copy or delete that IndexedDB history.

## Deployment shape

The `main` branch builds Production; `beta` builds Preview. Both Git deployments
are enabled in `vercel.json`. Production requires the explicit server setting
`INTELIPREP_ENV=production`; without it the readiness guard rejects Production
requests. The same shared Redis, authentication and quota checks remain required.

Vercel Authentication must use **All Deployments**, covering both custom Production
domains and Preview URLs. Vercel made this option free on every plan in
[September 2026](https://vercel.com/changelog/protect-production-deployments-for-free-on-every-plan).
No public launch or protection bypass is implied by deploying to Production.

### GitHub releases

The existing Vercel project connects to `ruchiagarwal75/inteliprep`. Push reviewed
changes to `beta` for Preview and fast-forward the reviewed commit to `main` for
Production. Keep `main` as the Production branch in Vercel.
The GitHub `Check` workflow runs `npm ci`, `npm run check`, and `npm run build`
using the pinned Node version. Vercel builds independently, so confirm both the
workflow result and the intended deployment's Ready status for the same commit.

Before sharing a release, verify the intended hostname points to that deployment,
signed-out requests still require Vercel Authentication, and an authorized
`/api/health` request returns `status: "ok"` with both checks true. Retain the same
browser hostname so testers keep their IndexedDB interviews. A successful health
check verifies configuration and Redis; it does not make a model request.

Enable Vercel Authentication → All Deployments under Settings → Deployment
Protection before sharing any URL. Standard Protection excludes Production domains.
Verify access in a signed-out browser. This configuration lives in the Vercel
dashboard, not in `vercel.json`. See
[Vercel Deployment Protection](https://vercel.com/docs/deployment-protection).

Use Vercel's deployment-sharing controls for invited testers; an access link is
a credential and should stay private. See
[sharing a preview](https://vercel.com/docs/deployments/sharing-deployments).
The app also requires candidate Google sign-in through Supabase Auth. Keep Vercel
Authentication enabled during this rollout; platform access and candidate identity
are separate checks. Interview quotas identify the verified candidate, so testers
on the same network have separate allowances. Anonymous error reports retain IP-based
limits. See [authentication setup](authentication.md) for provider configuration.

## Project and environment setup

1. Connect the Vercel account and import `ruchiagarwal75/inteliprep`. Use the Next.js
   preset, repository root, `npm ci` and `npm run build`. Node 24 is pinned in
   `package.json`; no secrets are needed during the build.
2. Enable Vercel Authentication for All Deployments before assigning any domain.
   Configure both Preview and Production deliberately; keep the Production opt-in
   unset until its configuration is complete.
3. Create an Upstash Redis database for this project. Choose a region near the
   Vercel function region and connect it to **Preview and Production**. The native integration
   supplies `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically. For a manual
   connection, configure the `UPSTASH_REDIS_REST_*` pair in the table below instead.
   The implementation uses atomic Lua commands over
   [Upstash's REST API](https://upstash.com/docs/redis/features/restapi).
4. In Settings → Environment Variables, add `OPENAI_KEY` and
   `INTERVIEW_RESUME_SECRET` as sensitive variables for **Preview and Production**.
   Generate the resume secret once with `openssl rand -hex 32`; paste the resulting
   64-character value directly into Vercel. Confirm the environment selection after
   saving. Enter secrets directly in the provider dashboards; do not paste them
   into chat or commit them. See [Vercel environment variables](https://vercel.com/docs/environment-variables).
5. Push the reviewed version to `beta` for Preview. For Production, set
   `INTELIPREP_ENV=production` in Production only, enable the same Auth and database
   settings there, and fast-forward `main`. Redeploy after environment changes.
   Check health on the built deployment before assigning the Production domain.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public Supabase project origin for candidate sign-in |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public `sb_publishable_...` client key; never a service-role/secret key |
| `OPENAI_KEY` | Server model-provider key for this project |
| `OPENAI_MODEL` | Optional; default is `gpt-6.1-sol` |
| `OPENAI_INTERVIEW_REASONING_EFFORT` | Sol interviewer, coverage and question review effort; default `low` |
| `OPENAI_SCORECARD_MODEL` | Optional separate grading model; defaults to `OPENAI_MODEL` |
| `OPENAI_SCORECARD_REASONING_EFFORT` | Sol grading effort; default `high` |
| `INTERVIEW_RESUME_SECRET` | Stable secret for browser resume tokens and rate-limit identities, at least 32 characters; generate with `openssl rand -hex 32` |
| `UPSTASH_REDIS_REST_URL` | HTTPS Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Redis REST credential with read/write and scripting access |
| `KV_REST_API_URL` | Native Vercel integration's Redis REST endpoint; alternative to `UPSTASH_REDIS_REST_URL` |
| `KV_REST_API_TOKEN` | Native Vercel integration's read/write REST token; alternative to `UPSTASH_REDIS_REST_TOKEN` |
| `INTELIPREP_ENV` | Leave blank locally, or use `beta` to exercise shared safeguards. Set `production` in Vercel Production to opt in to this release |

The native Upstash integration may install `KV_REST_API_URL` and
`KV_REST_API_TOKEN`. The app accepts that pair directly; copying or renaming the
secrets is unnecessary. An explicitly configured `UPSTASH_REDIS_REST_*` pair takes
precedence. Both values must come from the same family/database; a partial explicit
pair fails readiness instead of borrowing the other integration's token.

To review configuration, list variable names, types and environment targets without
decrypting values. Check that both application secrets target the intended environment and that the
Redis REST URL/token pair is available there from the same database. The example
file contains empty secret values; `.env.local` and `.vercel` stay gitignored.
After redeployment, an authorized `/api/health` request must return 200 with both
checks true. That checks server configuration and Redis reachability; a model-backed
chat reply separately verifies provider access.

For REST API deployments, explicitly use `target: "staging"` for the Preview
environment. The first file upload in this project defaulted to Production when
the target was omitted, and was canceled. The API rejects `target: "preview"`.
CLI commands still use their documented Preview target; inspect the returned
deployment target before sharing it.

Keep the resume secret stable across builds and provider-key rotation. Rotate it
deliberately if compromised; old unfinished checkpoints will stop reconnecting.
Preview and Production use separate Redis key namespaces. Before switching a
hostname between them, check for live interviews and leave the previous protected
Preview URL available. Existing browser history is preserved, but unfinished
server progress is not automatically moved between namespaces. Use separate Redis
databases and model keys for unrelated projects.

The stable branch URL matters: IndexedDB is tied to the browser origin. Opening
a different deployment hostname starts with separate browser history. Localhost
history will not automatically appear on the beta hostname.

## Request limits and coordination

| Endpoint | Per minute | Per hour | Per day | Maximum JSON body |
| --- | ---: | ---: | ---: | ---: |
| Chat | 10 | 120 | 200 | 4,000,000 bytes |
| Start | 3 | 10 | 10 | 32,768 bytes |
| End / retry scorecard | 5 | 20 | 40 | 4,000,000 bytes |
| Resume | 60 | 1,000 | 3,000 | 32,768 bytes |
| Browser error report | 30 | 300 | 1,000 | 2,048 bytes |

Interview limits apply per verified candidate and endpoint; anonymous monitoring
uses the trusted client IP. An HMAC replaces identifiers in Redis keys. Chat and end requests also share ceilings of 500 requests per hour and 2,000 per day
for the deployment environment. These are request ceilings, not dollar budgets:
a chat can make coverage, reply, and question-review calls, and grading can retry invalid
output once. Review provider usage and configure account spending controls before
expanding the tester group. Change quotas in `src/lib/request-limits.ts`.

Atomic Redis operations prevent different instances bypassing quotas or running
chat and grading concurrently for one interview. A session lock lasts three minutes
and uses owner-checked writes/releases. Chat has a 120-second Vercel maximum and
45-second model timeout. Grading has a shared 120-second model budget, 135-second
browser deadline, and 150-second route maximum. SDK retries remain disabled.
See [function durations](https://vercel.com/docs/functions/configuring-functions/duration)
and [OpenAI SDK timeouts](https://developers.openai.com/api/reference/typescript#timeouts).

The server persists the frozen end hash before grading and caches successful
feedback for two hours of inactivity. Shared records are validated JSON containing
verified chat transcripts, progress, the most recent turn/reply for safe retries,
and cached feedback; PNGs remain excluded. These records are readable in Redis.
The browser retains native drawings and the frozen evidence needed for grading
retries. Existing encrypted Redis records are read for compatibility and rewritten
as JSON on the next successful save. Browser resume tokens remain encrypted and
authenticated, so the stable resume secret is still required.
Beta requests load shared progress into an isolated RAM working copy; they never
use a process-wide interview cache. Streamed callbacks keep their request scope
until completion/cancellation, and session publication/lease release removes the
working copy. A retry on another instance reloads the verified transcript and progress, and validates the
browser's frozen evidence. Ordinary local development keeps its bounded in-memory
fallback so Redis remains optional there.
Chat accepts one new candidate message, a stable turn ID, and the expected message
count. Browser-authored histories and assistant/system message submissions are
rejected. A completed turn is replayed on a matching retry without model calls.
Ending validates the transcript against server history and may include one unanswered
candidate send plus one confirmed unsent answer. A replayed reply does not advance
whiteboard delivery baselines, so edits made before retry remain eligible for the next turn.
Active records created before transcript storage, or whose
transcript has expired, cannot be reconstructed from browser history: close without
scoring and start a new interview. Cached browser scorecards remain viewable.

Model chat context keeps complete recent messages and the configured opening within
32,000 UTF-8 bytes. All provider calls additionally check a 128,000-byte text budget,
including instructions and escaped JSON; images retain their separate size limits.
Chat generation is capped at 800 output tokens; assessment, review, and grading have
their own bounded output and retry limits. The stored conversation is capped at
96,000 UTF-8 JSON bytes with room reserved before another turn is accepted.

Resume returns the owner-verified transcript and any cached scorecard. Stale chat
counts and mismatched end histories return `INTERVIEW_TRANSCRIPT_CHANGED` with 409.
The browser offers Load latest version, rereads its latest IndexedDB revision, and
replaces chat from the server while keeping this tab's drawing, draft, and unmatched
candidate messages in a separate unsent section. Fresh persistence remounts the
workspace; stale delivery baselines are cleared so the next turn sends the board.
Recovered messages are expanded by default, with an individual Copy action and
clipboard success/error feedback; copying preserves the existing message-box draft.
Missing transcripts still fail closed; browser history never becomes server history.

The chat UI reads Retry-After, displays the seconds remaining, and disables retry
until the wait expires. Application-level generation retries at most once for a
connection failure or provider 408/500/502/503/504, only before any visible output,
within an 85-second total generation budget. Authentication errors, invalid input,
429, cancellation, and partially delivered replies are not retried automatically.
SDK retries remain disabled. Safe structured logs distinguish model retries and
question-review fallbacks without recording candidate text or provider error bodies.
Invalid novelty-review output selects a specific unasked probe instead of failing
the turn. Recognized unrelated task requests receive a neutral design redirect.

To exercise the transient 503 retry locally without a provider key or server, run:

```bash
npm test -- tests/local-model-retry.test.ts
```

This test uses the real chat route, injects a 503 on its first generation attempt,
then verifies a successful streamed reply, exactly one retry, and a single committed
conversation turn. Provider responses are mocked; no paid request is made.

For a browser check, restart the local server with:

```bash
INTELIPREP_TEST_MODEL_503_ONCE=1 npm run dev
```

Send a normal design-discussion answer that needs a model reply. The terminal should
show `model_test_fault` followed by `model_retry`, and chat should complete without
an error banner. The simulated failure happens before provider network work; the
retry makes the normal provider call. Deterministic drawing acknowledgements,
configured facts, and cached replays do not trigger this fault. It resets per chat
request and is ignored outside local development, including private-beta mode.
Restart without the flag after testing. Requests cannot enable the flag.

Google sign-in and an owner-bound opaque checkpoint are required for chat/end/resume
in beta. A copied session ID or checkpoint cannot access another account’s progress
or cached scorecard, even after Redis expiry. A shared-store failure fails closed rather than making an
unguarded model call. Local mode retains process state and the same bounded quotas.

## Error monitoring

API responses include `X-Request-Id`. Vercel runtime logs receive structured JSON
events with route, status, request ID and response-preparation time. Streaming
failures, grading failures, coverage failures and uncaught framework errors have
separate event names. Provider errors record their status, excluding bodies,
headers, messages and stacks. Diagram debug output exists only in development.

Browser runtime, unhandled promise, render and autosave failures send allowlisted
categories and a SHA-256 fingerprint to `/api/monitoring/client-error`. They send
no raw error, transcript, drawing, session ID or URL query. Reporting is deduplicated,
bounded and best-effort; monitoring failures never block an interview.

For the beta, inspect runtime logs after tester sessions and search `api_failure`,
`chat_stream_failure`, `grading_failure`, `stage_assessment_failure`,
`framework_failure` and `client_failure`. Log retention is controlled by the hosting
plan. No external alert destination or uptime monitor is provisioned by this code.
Add those services before relying on unattended incident detection; a protected
health check needs authorized access without removing deployment protection.

## Release smoke test

1. In a signed-out browser, confirm the intended Preview or Production hostname
   and its API routes require authorized Vercel access.
2. In an authorized browser, open `/api/health`: expect 200 with `status: "ok"` and
   both checks true. It checks Redis and settings, not provider billing/model access.
3. Start a 45-minute scaling interview, ask a clarification, draw and explain,
   then refresh. Confirm draft, board, transcript and countdown survive.
4. Redeploy the same branch and reopen the same browser session. Confirm the server
   resumes progress without restarting its timer.
5. End and score. Repeated scoring should return cached feedback. Run a 1-minute
   empty attempt and verify an unassessed scorecard and preserved draft choice.
6. Test two overlapping requests against one session: the second should return 409.
   With synthetic requests, exceed the start quota: expect 429 and `Retry-After`.
   A Redis outage should produce 503 before a new model call.
7. Check logs for failure categories and request IDs; verify no interview text,
   diagram data or credentials were logged. Reopen the saved scorecard offline.

Use test evidence for smoke tests. Keep actual beta data out of repository fixtures.
Unit tests simulate shared-store state and process loss; the deployed smoke test
must also verify the actual Upstash scripting permissions and Vercel protection.

## Troubleshooting and rollback

- **503 / unhealthy:** confirm environment-scoped settings, the Production opt-in
  when applicable, secret length and the REST
  endpoint/token; redeploy. Check Redis availability. Never disable shared limits
  to make an unhealthy beta accept paid requests.
- **429:** wait for `Retry-After`; shared-network testers may hit the same quota.
  Distinguish app quotas from provider capacity using the request ID and logs.
- **409 busy after a crashed request:** wait up to three minutes for the lock lease.
  Do not manually clear a lock while a request might still be running.
- **Old checkpoint rejected:** verify the resume secret did not change. Existing
  browser records and successful scorecards remain available for review.
- **Grading failure:** frozen browser evidence is retained for Retry scorecard.
  Check provider credentials/capacity and the structured failure status first.
- **Rollback:** redeploy the last known good commit to the same protected Preview
  branch URL, retaining the JSON session-record reader. Older code that only reads
  encrypted records cannot read newly written JSON records. Retain the resume
  secret and Redis namespace. Re-run health and one
  complete interview before inviting testers back.
