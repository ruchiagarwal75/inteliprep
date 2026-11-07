You're working on MockMeAI (this repo). I had the codebase reviewed for security issues and bad practices before launch. Fix the items below in order. Each item says where the problem is, why it matters, what to do and how to check it's done.

Before you start, commit the current uncommitted UI work (about 46 modified files plus new fonts, guide images and CSS) as its own commit, so these fixes stay separate.

## Already good, don't break these

- Every candidate API route goes through `withApiRequest` (sign-in check, same-origin check, rate limits, body size limits).
- Admin access re-checks the user with Supabase `getUser()` and matches one `ADMIN_USER_ID`.
- Resume tokens are AES-256-GCM sealed and tied to the owner's user ID.
- SQL uses parameterized `postgres` tagged templates. No raw string SQL in app code.
- The auth callback only redirects to fixed paths (no open redirect).
- Server logs use a strict allowlist and never log messages, transcripts or tokens.
- Prompts treat candidate text and diagram labels as untrusted data.
- `src/lib/problems.ts` is `server-only`, so rubrics never reach the browser.

---

## Priority 1: Fix before launch

### 1. Upgrade Next.js (critical)

- **Where:** `package.json` has `next` and `eslint-config-next` at `16.3.8`.
- **Why:** `npm audit --omit=dev` reports 2 critical and 1 high advisory for Next.js `16.0.0` to `16.4.0`:
  - GHSA-2464-fhr4-w9xw: unauthenticated remote code execution in the Image Optimization API when SVG files are used. The app uses `next/image` in `brand.tsx` and `practice-guide.tsx`, so that endpoint is live.
  - GHSA-673q-mjm6-r5xr: unauthenticated remote code execution in `use cache` functions returning typed arrays.
  - GHSA-p3m5-59mp-jv5r: denial of service in the App Router through Server Actions.
- **Fix:** Upgrade `next` and `eslint-config-next` to `16.4.5` or later. Run `npm run check` and `npm run build`.
- **Done when:** `npm audit --omit=dev` shows no Next.js advisories, and the full check and build pass.

### 2. Block the 1-minute test interview on the server

- **Where:** `src/lib/interview-timer.ts` (`interviewDurationSchema = z.union([z.literal(1), z.literal(45)])`), used by `POST /api/interview/start`.
- **Why:** The UI hides "1 minute (test)" unless you're in development, but the server still accepts `durationMinutes: 1` from anyone signed in. Those sessions:
  - skip the stage time gate (`src/lib/interview-turn.ts`, around lines 107 and 223),
  - are marked `is_test`, so `src/lib/admin-scope.ts` hides them, and their AI costs, from admin reports by default.

  So any user can run sessions that never show up in your usage or cost numbers.
- **Fix:** Only accept `durationMinutes: 1` when a server-only flag is on (for example `INTELIPREP_ALLOW_TEST_INTERVIEWS=1`, not a `NEXT_PUBLIC_` variable) or when the caller is the admin. Otherwise return 400. Add a test.
- **Done when:** On a production-like setup, starting with `durationMinutes: 1` returns 400 for a normal user.

### 3. Decide who can sign up

- **Where:** There's no allowlist or invite check anywhere in `src/`. Any Google account can sign in.
- **Why:** The app calls itself a private beta, but access isn't limited in code. Rate limits in `src/lib/request-limits.ts` give each user 200 chat calls a day, and there's one shared cap of 2,000 model calls a day for everyone. About 10 accounts used heavily (or one person with 10 Google accounts) can hit the shared cap and lock out every other user for the rest of the day.
- **Fix (pick one and tell me which):**
  - Keep it private: add an email allowlist checked in `requireCandidateIdentity()` (server-only env var or a Supabase table), or turn off new sign-ups in Supabase Auth.
  - Go public: lower the per-user daily chat limit, add a per-user daily start limit that matches what a real person needs, and send yourself an alert when the shared cap passes 70%.
- **Done when:** A Google account that isn't allowed gets a clear "not invited yet" page (private), or the per-user limits plus an alert are in place (public).

### 4. Add security headers

- **Where:** No `headers()` in `next.config.ts`, and nothing in `src/proxy.ts` besides `Cache-Control`.
- **Why:** Without `frame-ancestors` or `X-Frame-Options`, any site can load the app in an iframe (clickjacking). Without a Content Security Policy, any future XSS bug has no second line of defense.
- **Fix:** Add `headers()` in `next.config.ts` for all routes:
  - `Content-Security-Policy` with at least `frame-ancestors 'none'`, `base-uri 'self'`, `object-src 'none'` and `form-action 'self'`. Then tighten `script-src`, `connect-src` (your Supabase URL) and `img-src` as far as Excalidraw allows. Start in `Content-Security-Policy-Report-Only` if needed.
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-Content-Type-Options: nosniff`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- **Done when:** `curl -I` on `/`, `/interview/new` and an API route shows these headers, and sign-in, the whiteboard and chat still work.

### 5. Add privacy policy and terms pages

- **Where:** `src/app` has no privacy or terms page.
- **Why:** The app stores Google emails and sends candidate text and whiteboard images to OpenAI. Google's OAuth consent screen needs privacy policy and terms links for a public app, and users should know their answers go to an AI provider.
- **Fix:** Add `/privacy` and `/terms` pages, link them from the footer and the sign-in page. Cover what's stored (browser history, server session for 2 hours, admin reporting), what's sent to OpenAI, and how to delete data.
- **Done when:** Both pages exist and are linked from the sign-in page and the footer.

### 6. Rebrand the Google sign-in screen

- **Where:** `docs/authentication.md` says the Google consent screen is set up as "InteliPrep".
- **Why:** Users will see "InteliPrep" when signing in to MockMeAI, which looks like phishing.
- **Fix:** This one is in the Google Cloud console, not the code. List the exact steps for me: app name MockMeAI, logo, the `mockmeai.com` authorized domain, and the privacy and terms URLs from item 5. Update `docs/authentication.md`.
- **Done when:** The docs match, and I have a checklist to finish it in the console.

---

## Priority 2: Fix soon after launch

### 7. Use a low-privilege database user for admin reporting

- **Where:** `src/lib/reporting-db.ts` connects with `SUPABASE_CONNECTION_STRING`.
- **Why:** If that's the default Supabase `postgres` user, the web server holds full database access, while reporting only needs the `interview_admin` tables and three columns of `auth.users`.
- **Fix:** Add a migration that creates a `mockmeai_reporting` role with:
  - `usage` on schema `interview_admin`
  - `select, insert, update` on its tables
  - `select (id, email, created_at)` on `auth.users`

  Document how to make a connection string for that role and use it in Vercel. Keep the full-access string for `npm run db:admin` only.
- **Done when:** Admin pages and reporting writes work with the new role, and the role can't read or write other tables.

### 8. Remove the fallback secrets for resume tokens

- **Where:** `key()` in `src/lib/session-token.ts` uses `INTERVIEW_RESUME_SECRET`, then `OPENAI_KEY`, then a random key per server process.
- **Why:** Production already requires `INTERVIEW_RESUME_SECRET`, so this is safe today. But reusing the OpenAI key as an encryption key ties two secrets together, so rotating the OpenAI key would silently break every saved interview. A random per-process key breaks resumes across instances without any error.
- **Fix:** Use `INTERVIEW_RESUME_SECRET` only. In development, fall back to a fixed, clearly named dev constant, and throw an error anywhere else if the secret is missing.
- **Done when:** There's no `OPENAI_KEY` reference in `session-token.ts`, and tests cover the missing-secret case.

### 9. Add dependency checks to CI

- **Where:** `.github/workflows/check.yml`.
- **Why:** Nothing in CI catches vulnerable packages, which is how the Next.js issue in item 1 got through. The workflow also pins actions by tag (`@v7`) instead of by commit SHA.
- **Fix:**
  - Add a step: `npm audit --omit=dev --audit-level=high`.
  - Add `.github/dependabot.yml` for npm and GitHub Actions, weekly.
  - Pin `actions/checkout` and `actions/setup-node` to full commit SHAs, with the version in a comment.
- **Done when:** CI fails on a high or critical production advisory, and Dependabot is turned on.

### 10. Add one real browser test to CI

- **Where:** `tests/` has only Vitest unit and integration tests. The Playwright scripts the agent used live in `.playwright-mcp/`, which is gitignored, so they're lost.
- **Why:** Most of the bugs in the design review (stage name mismatch, layout, skeleton, button states) only show up in a real browser.
- **Fix:** Add `@playwright/test` and one smoke test: sign in with a mocked session, open the brief, start an interview, send one message, end it, and see the results page. Use a stubbed model response so CI never calls OpenAI. Run it in CI after the build.
- **Done when:** `npm run test:e2e` passes locally and in CI.

---

## Priority 3: Cleanup

### 11. Move screenshots out of git

- **Where:** `artifacts/` has 42 tracked PNG files (about 4.9 MB), plus the new `artifacts/mockmeai-design-review/` folder.
- **Why:** Every new round of screenshots makes the repo bigger forever, and they aren't needed to build or run the app.
- **Fix:** Add `artifacts/` to `.gitignore`, remove the tracked files from the index (`git rm -r --cached artifacts`), and keep screenshots outside the repo or in the PR description.
- **Done when:** `git ls-files artifacts` is empty, and the files still exist on disk.

### 12. Pick one styling approach

- **Where:** `src/app/globals.css` imports about 15 page CSS files (around 2,100 lines), all global. Tailwind classes are used only in the admin pages, `layout.tsx` and `error.tsx`.
- **Why:** Global CSS for every page means a class change on one page can break another, and having two styling systems is how the interview and results pages drifted away from the home page look.
- **Fix:** Don't rewrite everything now. Move shared tokens (colors, radius, spacing, button and card styles) into `theme.css` and use them everywhere. Make new page styles CSS Modules or page-scoped imports. Choose one approach for admin pages (Tailwind or the same tokens), and document the rule in `CLAUDE.md`.
- **Done when:** There's a short styling section in `CLAUDE.md`, and the interview and results pages use the shared button and card classes.

### 13. Rename what's confusing

- **Where:**
  - `isPrivateBeta()` in `src/lib/beta-config.ts` returns true on every Vercel deployment, including production.
  - Old "InteliPrep" names remain in env vars (`INTELIPREP_*`), the auth cookie (`inteliprep-auth`) and Redis keys (`inteliprep:v1`).
- **Why:** A function named "private beta" that's true in production will lead to mistakes later.
- **Fix:**
  - Rename `isPrivateBeta()` to something like `usesSharedStore()` or `isDeployed()`.
  - Leave the cookie name and Redis prefix alone (changing them signs everyone out and drops live sessions), but add a comment and a note in `CLAUDE.md` explaining the old name.
- **Done when:** The rename is done with tests passing, and the note is in `CLAUDE.md`.

### 14. Make production errors easier to debug

- **Where:** `src/lib/server-events.ts` logs only the error type, never the message or stack.
- **Why:** That's good for privacy, but when something breaks in production you'll only see "TypeError" with a request ID.
- **Fix:** Add an error tracker (for example Sentry) with scrubbing turned on: no request bodies, no message text, no cookies. Or log a stack trace with string values removed. Keep the current allowlist for normal logs.
- **Done when:** A thrown server error in a preview deployment shows a file and line number somewhere you can see.

### 15. Track the Excalidraw dependency warnings

- **Where:** `npm audit` flags `lodash-es`, `nanoid`, `katex` and mermaid packages that come in through `@excalidraw/excalidraw`.
- **Why:** These run in the browser and the app doesn't use the Mermaid import feature, so the risk is low. `npm audit fix --force` would downgrade Excalidraw to 0.17.6, which you shouldn't do.
- **Fix:** Don't force-fix. Add `overrides` in `package.json` for `nanoid` and `lodash-es` if patched versions work with Excalidraw, and check again when Excalidraw releases an update.
- **Done when:** You've either added the overrides with the whiteboard still working, or left a short note in `CLAUDE.md` explaining why they're accepted for now.

---

## When you're done

Send me a short summary:

- what you changed for each item, by number
- the files you changed
- anything you skipped or decided differently, and why
- for item 3, which option you picked
- for item 6, my checklist for the Google console
