# MockMeAI

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

Set `OPENAI_KEY` in `.env.local` to a server API key. `.env.example` selects
`gpt-6.1-terra` for interactive calls and `gpt-6.1-sol` for scorecards after a
latency comparison. The compatibility fallback when `OPENAI_MODEL` is unset
remains `gpt-6.1-sol`. Interview replies, stage checks, and follow-up reviews use
`OPENAI_INTERVIEW_REASONING_EFFORT=low`; scorecards use
`OPENAI_SCORECARD_REASONING_EFFORT=high`. `OPENAI_SCORECARD_MODEL` optionally
selects a separate grader and otherwise uses `OPENAI_MODEL`. Reasoning settings
support low, medium, high, xhigh, and max for Sol; Terra also supports none.
Set a stable
`INTERVIEW_RESUME_SECRET` of at least 32 characters;
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

On the Brief, choose **45 minutes** (default) or **1 hour**. The server fixes the
deadline when you start, and refresh/resume preserves it. Stage timing and the
scorecard's minimum evidence window scale with the selected duration.

Interview URLs are `/interview/<id>` and results are `/interview/<id>/results`. Old `?session=` links still work. Set `NEXT_PUBLIC_ENABLE_TEST_INTERVIEWS=1` before starting the dev server to show the 1-minute test option. History shows the three most recent attempts for each account, with View all revealing the rest. Every saved attempt remains independently readable and editable in IndexedDB; no history view or automatic cleanup deletes them. Signing out keeps browser history. The legacy anonymous `inteliprep` database stays separate from `inteliprep:account:<id>` to avoid assigning anonymous evidence to the wrong account; an explicit import policy is future work.
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

Private operational reporting is at `/admin`. Setup, metric definitions, data
coverage, exclusions, debugging references and cost estimates are documented in
[docs/admin.md](docs/admin.md). Configure the exact server-only `ADMIN_USER_ID` and
`SUPABASE_REPORTING_CONNECTION_STRING`. Keep the privileged `SUPABASE_CONNECTION_STRING` for `npm run db:admin` only; see the restricted-role setup in the admin guide.

Interviewer requests use a stable explicitly cached problem/rubric prefix, a bounded summary of older turns and the latest eight messages. The full verified transcript remains authoritative for scoring and question memory. Turn logs record latency, token usage, cache reads and reasoning tokens without candidate answers. Local settings use `OPENAI_MODEL=gpt-6.1-terra` with `OPENAI_INTERVIEW_REASONING_EFFORT=low`; grading stays `gpt-6.1-sol` / `high`. Configure the same overrides in Preview before deploying to use them there. Grading has a 120-second provider deadline, a 135-second client deadline and a 150-second route budget.

The Brief sends one POST per Start click with an account-scoped client request UUID, retained across failed requests and Brief refreshes. The server replays that UUID for two hours with the original start/deadline. In the private beta, publishing the transcript, replay response and new-session quota is atomic in Redis; retries do not consume start quota. Clients predating request IDs still work but cannot deduplicate an ambiguous retry.

For the one-minute local test, set `NEXT_PUBLIC_ENABLE_TEST_INTERVIEWS=1` and the server-only `INTELIPREP_ALLOW_TEST_INTERVIEWS=1` (or sign in as the configured admin) in `.env.local`, restart `npm run dev` and reload the Brief. Select **1 minute (test)** before starting. `?debug=1` has no effect. Production bundles need rebuilding after a public environment setting changes. Local start quotas are off unless `INTELIPREP_DEV_START_LIMITS=on`; chat/model quotas stay enabled.

## MockMeAI branding and domain

The public product name is **MockMeAI**, with `https://mockmeai.com` as its intended
public origin. `src/lib/brand.ts` owns the shared name, description, and domain.
The wordmark, teal/navy theme, favicon, and Apple touch icon use the same identity.

The existing GitHub, Vercel, and Supabase project names can stay as they are.
`inteliprep` storage keys, cookies, Redis namespaces, signed-token contexts, and
`INTELIPREP_*` environment variables are deliberately retained for compatibility.
Rebranding does not rename databases or remove saved interviews.

Before serving the app on the custom domain:

- Add `mockmeai.com` to the existing Vercel project and configure the DNS records
  Vercel supplies. Keep the current beta deployment protection policy.
- Add `https://mockmeai.com/auth/callback` to Supabase's allowed app return URLs.
  Set its Site URL to the custom origin when cutting over. Keep the existing
  local and beta return URLs while they are still in use.
- Update Google's consent-screen display name to **MockMeAI** and add
  `https://mockmeai.com` to the OAuth client's JavaScript origins. The existing
  Google-to-Supabase callback remains unchanged.

Browser history is scoped to a website origin. Existing interviews remain on the
original localhost or beta hostname; a new domain does not automatically import
that hostname's IndexedDB history.

## Visual theme

Home and Brief use a lightweight inline SVG architecture hero, with cream content
surfaces, navy, teal, amber and coral. `ArchitectureHero` has an accessible title
and description, three staggered request packets and destination pulses. CSS
animations pause in hidden tabs and become a still frame with reduced motion.
Palette, spacing and corner tokens live in `src/app/theme.css`. Interview and
scorecard content stays plain. [Before/after captures](artifacts/mockmeai-architecture/README.md)
include desktop and phone views.

## Private-beta and security configuration

Invitations live in `interview_admin.beta_invites`. The configured admin manages
exact Google email approvals at `/admin/access`, without redeploying.
An authenticated but uninvited account gets `/not-invited`; candidate APIs deny it
before model work. Run `npm run db:admin` before deploying this version. The old
environment list is only a one-way migration input, never a runtime fallback.
Google Audience test users and Vercel
protection are independent controls. See [authentication](docs/authentication.md)
for the Google branding checklist and callback configuration.

[Privacy policy](/privacy) and [terms](/terms) explain local history, temporary
server state, AI processing and deletion requests. Error logs retain scrubbed
owned code locations, not messages or raw stacks. All routes have security headers;
page scripts use per-request CSP nonces. Excalidraw's dynamic style attributes,
font loading and font-subsetting WebAssembly are explicitly bounded exceptions.

Run `npm run test:e2e` after installing Chromium with `npx playwright install chromium`.
The smoke test creates isolated local Auth/model fixtures and a production build
on port 3100, with no paid model calls. It covers private access, real drawing,
chat, end, saved results and headers. CI installs Chromium with OS dependencies.
Screenshots in `artifacts/` remain local and are not versioned. See CLAUDE.md for
current dependency overrides and the remaining low-severity Mermaid/KaTeX notes.
