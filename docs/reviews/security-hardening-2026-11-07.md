# MockMeAI pre-launch security hardening

The prior UI work is isolated in commit `35ed7a8`. This change preserves saved
interviews, Auth cookie names, Redis namespaces and the eight problem rubrics.

## Numbered implementation

1. **Next.js:** Next and eslint-config-next are pinned to 16.4.5. Audit no longer
   reports Next advisories; the check suite and production build pass.
2. **Test interviews:** the start endpoint rejects a normal user's one-minute
   request with 400 before creating a session or consuming a new-session quota.
   Server-only `INTELIPREP_ALLOW_TEST_INTERVIEWS=1` or fresh admin verification is
   required. Hiding the picker is not the security boundary.
3. **Private access selected:** `MOCKMEAI_INVITED_EMAILS` is an exact-email,
   server-only allowlist checked against verified Auth claims before candidate
   API work. Missing configuration permits only `ADMIN_USER_ID`. Uninvited
   accounts see `/not-invited`, can switch accounts and cannot reach model work.
   OAuth may create an Auth account; registration alone does not grant access.
4. **Headers:** all routes receive CSP framing/base/object/form restrictions,
   DENY framing, nosniff, referrer and camera/microphone/location policy. Page
   scripts additionally require a fresh nonce and strict-dynamic. Production has
   no unsafe-eval or unsafe-inline script exception. Dynamic style attributes,
   Excalidraw font loading from esm.sh and font-subsetting WebAssembly have
   explicit exceptions. Development permits the eval/HMR support it needs.
5. **Policies:** `/privacy` and `/terms` are linked on Home and sign-in. They cover
   browser history, two-hour inactive interview-state expiry, reporting, first
   visits, AI processing, local deletion and contacting the beta operator for
   account/server deletion. The operator contact remains the person who invited
   the candidate; no unmonitored support mailbox was invented.
6. **Google branding:** docs/authentication.md now has the MockMeAI branding,
   domain/logo, homepage/privacy/terms, callback and verification checklist. The
   Google console change is an operator action and is not claimed as performed.
7. **Least privilege:** the app exclusively reads the restricted
   `SUPABASE_REPORTING_CONNECTION_STRING`; the privileged connection is reserved
   for operator migrations. A migration creates a NOINHERIT reporting role with
   no role/schema administration, DELETE or BYPASSRLS. It receives reporting
   SELECT/INSERT/UPDATE and role-specific RLS policies. Only id/email/created_at
   are granted on Auth users. A private, SELECT-only, non-updatable projection
   preserves anonymous/deleted-user filtering without exposing those status
   columns or requiring grants on Supabase's managed Auth schema. The restricted
   URI is configured for Preview and Production, and the old broad runtime
   credential value is cleared. Local operator credentials are kept separately.
8. **Resume keys:** only `INTERVIEW_RESUME_SECRET` supplies encryption key material.
   A named stable constant is allowed solely in local development. Other missing
   secrets fail closed; provider-key rotation no longer affects this key. Existing
   tokens using the already-configured dedicated secret keep the same format/key.
9. **CI:** a high/critical production audit gate, weekly npm/Actions Dependabot,
   and full-SHA action pins are configured. The lockfile is committed.
10. **Browser CI:** Playwright exercises the production build with local HTTPS
    Auth and model fixtures. It opens the brief, starts once, draws, sends a
    message, ends, checks feedback, reloads saved results and verifies access
    denials/headers. It uses a separate build directory and port 3100, with no
    production credentials, database writes or paid model requests. No application
    authentication bypass is introduced. CI installs Chromium before running it.
11. **Screenshots:** `artifacts/` is ignored and all its files are removed from the
    Git index. The 66 local evidence files remain on disk. Public guide images
    and fonts remain tracked because they are application assets.
12. **Styling:** shared button/card primitives now live with theme tokens.
    Interview and results use the shared paper-card and button classes. New
    styles use CSS Modules. Admin keeps Tailwind utilities mapped to the shared
    theme. CLAUDE.md documents this incremental approach.
13. **Naming:** `usesSharedStore()` replaces `isPrivateBeta()` throughout code and
    tests. Stable cookie names, Redis prefixes and legacy environment names are
    documented and preserved.
14. **Diagnostics:** existing server logs add bounded owned relative file names
    and line/column numbers, with server-only source maps. Messages (including
    multiline forged frame text), arguments, remote URLs, raw stacks, cookies and
    request bodies are omitted. An authenticated owner-only Preview diagnostic
    at `/api/admin/overview?diagnostic=throw` verifies the failure log. Production
    ignores that parameter. No external error tracker is introduced.
15. **Dependencies:** Excalidraw stays at 0.18.1. Overrides use nanoid 3.3.20 for
    version-3 consumers, 5.1.16 for version-4/5 consumers, and lodash-es 4.18.1.
    There are no high/critical production findings. Four low entries propagate
    the remaining KaTeX trust-restriction advisory through Mermaid/Excalidraw;
    they remain visible in audit and documented pending an upstream update.
    No force-fix or Excalidraw downgrade was used.

## Verification

- 1,108 unit/integration tests passed; the default suite skips the existing opt-in
  real-database test. That database test was separately enabled and passed.
- TypeScript, ESLint, formatting, production build and the high/critical audit
  gate passed. The audit reports four low findings, zero moderate/high/critical.
- Both Playwright tests passed, including actual whiteboard drawing and saved
  results after reload. All model calls were handled by the local fixture.
- A real restricted database login read the reporting projection and inserted/
  updated a test reporting row. Auth secrets, unrelated table access, deletes and
  schema creation were denied. Test writes rolled back. Existing reporting
  interviews remained intact.
- Header probes cover Home, Brief and an API route. The nonce varies by request;
  browser tests exercised the policy with the whiteboard and chat.
- A fresh signed-in Chrome tab loaded the Brief with 14 nonced script elements, no CSP violations and a successful restricted-role admin read. Its account database retained all 37 browser saves. Older hot-reload tabs needed replacing after the live package update.
- Dependency changes required restarting the existing local dev server and
  rebuilding its stale webpack cache. That generated cache was moved aside;
  browser history, interviews and drawings were not touched.

## Operator checklist

- Add invitees to `MOCKMEAI_INVITED_EMAILS` for each intended environment and
  redeploy. The current missing-list default is admin-only. Google Audience test
  users and Vercel deployment protection are separate gates.
- Complete the [Google console branding checklist](../authentication.md#google-console-rebrand-checklist-operator-action).
- For another database/environment, run the migration and restricted-role setup
  in [the admin guide](../admin.md#restricted-runtime-database-role). Never use a
  full-access connection as the web app's fallback.
- Recheck the four low dependency entries when Excalidraw/KaTeX compatibility
  changes. The high/critical CI gate remains enabled.

Sources: [Next CSP](https://nextjs.org/docs/app/guides/content-security-policy),
[Supabase roles](https://supabase.com/docs/guides/database/postgres/roles),
[column grants](https://supabase.com/docs/guides/database/postgres/column-level-security),
[Google branding](https://support.google.com/cloud/answer/15549049).

## Changed files

- [.env.example](../../.env.example)
- [.github/dependabot.yml](../../.github/dependabot.yml)
- [.github/workflows/check.yml](../../.github/workflows/check.yml)
- [.gitignore](../../.gitignore)
- [AGENTS.md](../../AGENTS.md)
- [CLAUDE.md](../../CLAUDE.md)
- [README.md](../../README.md)
- [docs/admin.md](../../docs/admin.md)
- [docs/authentication.md](../../docs/authentication.md)
- [docs/reviews/retest-2026-11-07.md](../../docs/reviews/retest-2026-11-07.md)
- [eslint.config.mjs](../../eslint.config.mjs)
- [next.config.ts](../../next.config.ts)
- [package-lock.json](../../package-lock.json)
- [package.json](../../package.json)
- [playwright.config.ts](../../playwright.config.ts)
- [scripts/configure-reporting.mjs](../../scripts/configure-reporting.mjs)
- [scripts/migrate-admin.mjs](../../scripts/migrate-admin.mjs)
- [scripts/verify-reporting-role.mjs](../../scripts/verify-reporting-role.mjs)
- [src/app/admin/page.tsx](../../src/app/admin/page.tsx)
- [src/app/api/admin/overview/route.test.ts](../../src/app/api/admin/overview/route.test.ts)
- [src/app/api/admin/overview/route.ts](../../src/app/api/admin/overview/route.ts)
- [src/app/api/health/route.ts](../../src/app/api/health/route.ts)
- [src/app/api/interview/start/route.test.ts](../../src/app/api/interview/start/route.test.ts)
- [src/app/api/interview/start/route.ts](../../src/app/api/interview/start/route.ts)
- [src/app/auth/callback/route.ts](../../src/app/auth/callback/route.ts)
- [src/app/interview.css](../../src/app/interview.css)
- [src/app/layout.tsx](../../src/app/layout.tsx)
- [src/app/not-invited/page.tsx](../../src/app/not-invited/page.tsx)
- [src/app/practice.css](../../src/app/practice.css)
- [src/app/privacy/page.tsx](../../src/app/privacy/page.tsx)
- [src/app/sign-in/page.tsx](../../src/app/sign-in/page.tsx)
- [src/app/terms/page.tsx](../../src/app/terms/page.tsx)
- [src/app/theme.css](../../src/app/theme.css)
- [src/components/chat-panel.tsx](../../src/components/chat-panel.tsx)
- [src/components/interview-live-header.tsx](../../src/components/interview-live-header.tsx)
- [src/components/invite-sign-out.tsx](../../src/components/invite-sign-out.tsx)
- [src/components/legal-links.module.css](../../src/components/legal-links.module.css)
- [src/components/legal-links.tsx](../../src/components/legal-links.tsx)
- [src/components/legal-page.module.css](../../src/components/legal-page.module.css)
- [src/components/legal-page.tsx](../../src/components/legal-page.tsx)
- [src/components/practice-home.tsx](../../src/components/practice-home.tsx)
- [src/components/practice-page.tsx](../../src/components/practice-page.tsx)
- [src/components/whiteboard.tsx](../../src/components/whiteboard.tsx)
- [src/lib/admin-api.ts](../../src/lib/admin-api.ts)
- [src/lib/admin-overview.ts](../../src/lib/admin-overview.ts)
- [src/lib/admin-scope.ts](../../src/lib/admin-scope.ts)
- [src/lib/admin-user-detail.ts](../../src/lib/admin-user-detail.ts)
- [src/lib/admin-users.ts](../../src/lib/admin-users.ts)
- [src/lib/api-request.ts](../../src/lib/api-request.ts)
- [src/lib/beta-config.test.ts](../../src/lib/beta-config.test.ts)
- [src/lib/beta-config.ts](../../src/lib/beta-config.ts)
- [src/lib/candidate-auth.test.ts](../../src/lib/candidate-auth.test.ts)
- [src/lib/candidate-auth.ts](../../src/lib/candidate-auth.ts)
- [src/lib/candidate-invites.test.ts](../../src/lib/candidate-invites.test.ts)
- [src/lib/candidate-invites.ts](../../src/lib/candidate-invites.ts)
- [src/lib/development-model-fault.ts](../../src/lib/development-model-fault.ts)
- [src/lib/idempotent-interview-start.ts](../../src/lib/idempotent-interview-start.ts)
- [src/lib/interview-session-context.ts](../../src/lib/interview-session-context.ts)
- [src/lib/reporting-db.test.ts](../../src/lib/reporting-db.test.ts)
- [src/lib/reporting-db.ts](../../src/lib/reporting-db.ts)
- [src/lib/request-limits.ts](../../src/lib/request-limits.ts)
- [src/lib/security-headers.test.ts](../../src/lib/security-headers.test.ts)
- [src/lib/security-headers.ts](../../src/lib/security-headers.ts)
- [src/lib/server-error-frames.test.ts](../../src/lib/server-error-frames.test.ts)
- [src/lib/server-error-frames.ts](../../src/lib/server-error-frames.ts)
- [src/lib/server-events.ts](../../src/lib/server-events.ts)
- [src/lib/session-token.test.ts](../../src/lib/session-token.test.ts)
- [src/lib/session-token.ts](../../src/lib/session-token.ts)
- [src/lib/shared-interview-session.ts](../../src/lib/shared-interview-session.ts)
- [src/lib/supabase-config.ts](../../src/lib/supabase-config.ts)
- [src/lib/test-interview-access.test.ts](../../src/lib/test-interview-access.test.ts)
- [src/lib/test-interview-access.ts](../../src/lib/test-interview-access.ts)
- [src/proxy.test.ts](../../src/proxy.test.ts)
- [src/proxy.ts](../../src/proxy.ts)
- [supabase/migrations/20261108003142_reporting_least_privilege.sql](../../supabase/migrations/20261108003142_reporting_least_privilege.sql)
- [tests/e2e/fixture-service.mjs](../../tests/e2e/fixture-service.mjs)
- [tests/e2e/interview.spec.ts](../../tests/e2e/interview.spec.ts)
- [tests/e2e/server.mjs](../../tests/e2e/server.mjs)
- [tests/setup.ts](../../tests/setup.ts)

All previously tracked artifacts are removed from the index, with local files retained.
