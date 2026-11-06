# InteliPrep

Practice a system design interview with an AI interviewer and an Excalidraw
whiteboard. Choose a problem, difficulty and duration; clarify requirements,
draw and explain your design, then end the interview for evidence-backed feedback.

The MVP includes streaming chat, diagram text and PNG input, interview stages,
a fixed timer, draft protection, scorecards, browser autosave and saved history.
Google sign-in gives each candidate an account. Interview history lives in
account-specific IndexedDB storage in the current browser. It does not sync
across devices or website origins, and clearing site data deletes it.

## Interview questions

The catalog includes eight problems, each at Mid-level, Senior, and Staff:

- Scale a single server.
- Design a URL shortener.
- Design a rate limiter.
- Design a chat service.
- Design a news feed.
- Design a notification system.
- Design a file storage service.
- Design a video streaming service.

See [problem scope and review cases](docs/problem-catalog.md) for the configured
goals, guarantees, and checks still required before beta onboarding.

## Local setup

Use Node.js 24 (also specified in `.nvmrc`) and npm.

```bash
nvm use
npm ci
cp .env.example .env.local
```

Set `OPENAI_KEY` in `.env.local` to a server API key. `OPENAI_MODEL` defaults to
`gpt-4o`. Set a stable `INTERVIEW_RESUME_SECRET` of at least 32 characters;
generate one locally with `openssl rand -hex 32`. Keep credentials out of source
control and never use `NEXT_PUBLIC_` for these settings. Changing the resume
secret invalidates old checkpoints, while already saved scorecards remain viewable.

Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
from your Supabase project. The publishable key is public browser configuration;
never use a service-role or secret key. See [Google sign-in setup](docs/authentication.md)
for provider settings and callback URLs. Sign-in is required locally as well as in beta.

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000). Home shows browser-local history; Start practice opens the brief before the timer starts.

Interview URLs are `/interview/<id>` and results are `/interview/<id>/results`. Old `?session=` links still work. Set `NEXT_PUBLIC_ENABLE_TEST_INTERVIEWS=1` before starting the dev server to show the 1-minute test option. History shows the latest attempt per problem for each account, across difficulties and durations. Earlier saved records remain in IndexedDB; no automatic cleanup or migration deletes them. Signing out keeps browser history. The legacy anonymous `inteliprep` database stays separate from `inteliprep:account:<id>` to avoid assigning anonymous evidence to the wrong account; an explicit import policy is future work.
Local development uses bounded in-memory request limits and session state;
start quotas are skipped locally unless `INTELIPREP_DEV_START_LIMITS=on`.
Chat and grading limits still apply. This override has no effect on deployed or
private-beta environments. `?debug=1` does not enable test durations: add
`NEXT_PUBLIC_ENABLE_TEST_INTERVIEWS=1` to `.env.local` and restart `npm run dev`.
Redis is only required for Vercel or `INTELIPREP_ENV=beta`.
Beta requests use Redis for shared progress and verified transcripts, and keep a temporary RAM working copy
only until publication or request cleanup, including streamed replies.
Redis progress and cached scorecards are stored as validated JSON. Browser resume
tokens remain protected by `INTERVIEW_RESUME_SECRET`.
Chat sends only a new candidate message, a stable turn ID, and its expected position.
Opening or resuming an active interview refreshes chat from the verified server
transcript. A stale tab offers Load latest version; its drawing, draft and unmatched
unsent messages stay in browser storage. Rate-limit replies show a retry countdown.
Recovered messages open by default and have individual Copy buttons. New interviewer
replies omit verbatim candidate passages while retaining useful component names.
The server owns prior messages and rejects browser-authored histories. Redis transcripts
expire after two hours of inactivity; a progress token cannot recreate a missing
transcript. Older active saves must be closed without scoring and restarted; saved
scorecards remain viewable. Limits include 10 chat requests/minute, 200/day, and
10 new interviews/day per account. See [deployment safeguards](docs/deployment.md).

## Checks and production build

```bash
npm run check
npm run build
npm run start
```

`check` runs TypeScript, ESLint, formatting and Vitest. Tests mock provider calls
and need no secrets. GitHub Actions runs the checks and production build on pushes
and pull requests. The build uses webpack, matching the verified local build.

## Private beta on Vercel

Follow [the deployment guide](docs/deployment.md) for protected previews,
Upstash Redis, environment settings, smoke tests and troubleshooting.
In Vercel, save `OPENAI_KEY` and `INTERVIEW_RESUME_SECRET` as **Secret** variables
for **Preview only**. The native Redis integration supplies the `KV_REST_API_*`
pair when connected to Preview. Redeploy after changing environment variables.
Vercel requires `OPENAI_KEY`, `INTERVIEW_RESUME_SECRET`, and
Redis credentials (`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, or the
native Vercel `KV_REST_API_URL` and `KV_REST_API_TOKEN` pair), plus the two
public Supabase settings; missing settings or a failed
shared store return 503 before any model work. `/api/health` checks readiness
without generating a model response.

## Project layout

- `src/app`: pages, API routes and error boundaries.
- `src/components`: chat, whiteboard and browser persistence UI.
- `src/lib`: validated schemas, diagram logic, private problem configs, interviewer,
  grading and shared server safeguards.
- `docs/spec.md`: architecture and implemented behavior.

Private rubrics, prompts and credentials stay on the server. Production error
events exclude interview content. Chat and drawing evidence still go to the model
provider when you send an answer or generate a scorecard.
