# InteliPrep

Practice a system design interview with an AI interviewer and an Excalidraw
whiteboard. Choose a problem, difficulty and duration; clarify requirements,
draw and explain your design, then end the interview for evidence-backed feedback.

The MVP includes streaming chat, diagram text and PNG input, interview stages,
a fixed timer, draft protection, scorecards, browser autosave and saved history.
Interview history lives in IndexedDB in the current browser. It does not sync
across devices or website origins, and clearing site data deletes it.

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

```bash
npm run dev
```

Open [localhost:3000/interview](http://localhost:3000/interview).
Local development uses bounded in-memory request limits and session state;
Redis is only required for Vercel or `INTELIPREP_ENV=beta`.
Beta requests use Redis for shared progress and keep a temporary RAM working copy
only until publication or request cleanup, including streamed replies.

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
Vercel requires `OPENAI_KEY`, `INTERVIEW_RESUME_SECRET`, and
Redis credentials (`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, or the
native Vercel `KV_REST_API_URL` and `KV_REST_API_TOKEN` pair); missing settings or a failed
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
