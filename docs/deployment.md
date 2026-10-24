# Vercel private beta

The Vercel project is `inteliprep` in `ruchiagarwal75s-projects`:
[project dashboard](https://vercel.com/ruchiagarwal75s-projects/inteliprep).
It uses Node 24 and Vercel Authentication for preview/deployment URLs. The local
`.vercel/project.json` records its project/workspace IDs and stays gitignored.
The existing beta URL is
[the protected interview app](https://inteliprep-ruchiagarwal75s-projects.vercel.app/interview).

## Deployment shape

Use a **protected Preview deployment** and its stable branch URL for testers.
Keep `main` as the Vercel Production branch and deploy a separate `beta` branch.
`vercel.json` disables automatic Git deployments from `main` so ordinary MVP
commits do not publish the beta to a production domain. Manual deployments still
need the correct Preview target and protection settings.
The beta's API readiness check also rejects the Vercel Production environment,
even if secrets were accidentally configured there. A later production release
must deliberately change this guard and verify protection for its chosen domain.

### GitHub releases

The existing Vercel project connects to `ruchiagarwal75/inteliprep`. Push reviewed
changes to `beta`; `vercel.json` explicitly enables that branch while disabling
automatic deployments from `main`. Keep `main` as the Production branch in Vercel.
The GitHub `Check` workflow runs `npm ci`, `npm run check`, and `npm run build`
using the pinned Node version. Vercel builds independently, so confirm both the
workflow result and the Preview deployment's Ready status for the same commit.

Before sharing a release, verify the existing beta URL points to that deployment,
signed-out requests still require Vercel Authentication, and an authorized
`/api/health` request returns `status: "ok"` with both checks true. Retain the same
browser hostname so testers keep their IndexedDB interviews. A successful health
check verifies configuration and Redis; it does not make a model request.

Enable Vercel Authentication under Settings → Deployment Protection before
sharing the URL. Standard Protection covers previews and deployment URLs but
excludes production domains; protecting every domain requires All Deployments.
Verify access in a signed-out browser. This configuration lives in the Vercel
dashboard, not in `vercel.json`. See
[Vercel Deployment Protection](https://vercel.com/docs/deployment-protection).

Use Vercel's deployment-sharing controls for invited testers; an access link is
a credential and should stay private. See
[sharing a preview](https://vercel.com/docs/deployments/sharing-deployments).
The app itself does not yet provide candidate accounts. Limits identify a trusted
platform client IP, so testers on the same network share quotas.

## Project and environment setup

1. Connect the Vercel account and import `ruchiagarwal75/inteliprep`. Use the Next.js
   preset, repository root, `npm ci` and `npm run build`. Node 24 is pinned in
   `package.json`; no secrets are needed during the build.
2. Enable Preview deployment protection. Avoid creating a publicly usable
   Production deployment during import; keep model/Redis secrets scoped to Preview.
3. Create an Upstash Redis database for this project. Choose a region near the
   Vercel function region and connect it to **Preview**. The native integration
   supplies `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically. For a manual
   connection, configure the `UPSTASH_REDIS_REST_*` pair in the table below instead.
   The implementation uses atomic Lua commands over
   [Upstash's REST API](https://upstash.com/docs/redis/features/restapi).
4. In Settings → Environment Variables, add `OPENAI_KEY` and
   `INTERVIEW_RESUME_SECRET` as **Secret** variables with **Preview only** selected.
   Generate the resume secret once with `openssl rand -hex 32`; paste the resulting
   64-character value directly into Vercel. Confirm the environment selection after
   saving. Enter secrets directly in the provider dashboards; do not paste them
   into chat or commit them. See [Vercel environment variables](https://vercel.com/docs/environment-variables).
5. Push the reviewed version to `beta`, or create a Preview deployment explicitly.
   Keep the Production branch set to `main`. Redeploy after changing environment
   variables, then use the protected branch URL for all subsequent testing.

| Variable | Purpose |
| --- | --- |
| `OPENAI_KEY` | Server model-provider key for this project |
| `OPENAI_MODEL` | Optional; existing default is `gpt-4o` |
| `INTERVIEW_RESUME_SECRET` | Stable secret for browser resume tokens and rate-limit identities, at least 32 characters; generate with `openssl rand -hex 32` |
| `UPSTASH_REDIS_REST_URL` | HTTPS Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Redis REST credential with read/write and scripting access |
| `KV_REST_API_URL` | Native Vercel integration's Redis REST endpoint; alternative to `UPSTASH_REDIS_REST_URL` |
| `KV_REST_API_TOKEN` | Native Vercel integration's read/write REST token; alternative to `UPSTASH_REDIS_REST_TOKEN` |
| `INTELIPREP_ENV` | Optional locally: set `beta` to exercise shared safeguards; Vercel automatically enables them |

The native Upstash integration may install `KV_REST_API_URL` and
`KV_REST_API_TOKEN`. The app accepts that pair directly; copying or renaming the
secrets is unnecessary. An explicitly configured `UPSTASH_REDIS_REST_*` pair takes
precedence. Both values must come from the same family/database; a partial explicit
pair fails readiness instead of borrowing the other integration's token.

To review configuration, list variable names, types and environment targets without
decrypting values. Check that both application secrets target Preview and that the
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
Preview and Production use separate Redis key namespaces. Use separate Redis
databases and model keys for unrelated projects.

The stable branch URL matters: IndexedDB is tied to the browser origin. Opening
a different deployment hostname starts with separate browser history. Localhost
history will not automatically appear on the beta hostname.

## Request limits and coordination

| Endpoint | Per minute | Per hour | Maximum JSON body |
| --- | ---: | ---: | ---: |
| Chat | 30 | 600 | 4,000,000 bytes |
| Start | 10 | 60 | 32,768 bytes |
| End / retry scorecard | 10 | 30 | 4,000,000 bytes |
| Resume | 60 | 1,000 | 32,768 bytes |
| Browser error report | 30 | 300 | 2,048 bytes |

The limits apply per trusted client IP and endpoint. An HMAC replaces raw IPs in
Redis keys. Chat and end requests also share a ceiling of 2,000 requests per hour
for the deployment environment. These are request ceilings, not dollar budgets:
a chat can make a coverage call and a reply call, and grading can retry invalid
output once. Review provider usage and configure account spending controls before
expanding the tester group. Change quotas in `src/lib/request-limits.ts`.

Atomic Redis operations prevent different instances bypassing quotas or running
chat and grading concurrently for one interview. A session lock lasts three minutes
and uses owner-checked writes/releases. Chat and grading routes have a 120-second
Vercel maximum; each model call uses a 45-second timeout with SDK retries disabled.
See [function durations](https://vercel.com/docs/functions/configuring-functions/duration)
and [OpenAI SDK timeouts](https://developers.openai.com/api/reference/typescript#timeouts).

The server persists the frozen end hash before grading and caches successful
feedback for two hours of inactivity. Shared records are validated JSON and exclude
full transcripts and PNGs. Progress and cached feedback, including selected answer
quotes, are readable in Redis. The browser retains the evidence needed for grading
retries. Existing encrypted Redis records are read for compatibility and rewritten
as JSON on the next successful save. Browser resume tokens remain encrypted and
authenticated, so the stable resume secret is still required.
Beta requests load shared progress into an isolated RAM working copy; they never
use a process-wide interview cache. Streamed callbacks keep their request scope
until completion/cancellation, and session publication/lease release removes the
working copy. A retry on another instance reloads Redis progress and validates the
browser's frozen evidence. Ordinary local development keeps its bounded in-memory
fallback so Redis remains optional there.
An opaque signed checkpoint is required for chat/end/resume in beta; a session ID
alone is insufficient. A shared-store failure fails closed rather than making an
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

1. In a signed-out browser, confirm the protected preview and its API routes require
   authorized access. Do not share the production hostname.
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

- **503 / unhealthy:** confirm Preview-scoped settings, secret length and the REST
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
