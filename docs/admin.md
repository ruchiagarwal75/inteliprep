# Private admin MVP

`/admin` has read-only reporting and an owner-only beta-access editor at
`/admin/access`. It uses Supabase Postgres and the
existing structured server logs; it adds no external analytics or monitoring
service. Account counts come directly from `auth.users`.

## Setup

1. Set server-only `ADMIN_USER_ID` to the exact Supabase Auth UUID of the owner.
   Find that UUID under Supabase Authentication → Users. The confirmed owner is
   configured locally in `.env.local`; no owner identity is hardcoded in the app.
   Missing/invalid configuration denies access. Never put it in a `NEXT_PUBLIC_`
   variable or use editable user metadata as an admin role.
2. Keep `SUPABASE_CONNECTION_STRING` as the operator-only migration URI. Configure the restricted `SUPABASE_REPORTING_CONNECTION_STRING` for the web app as described below. Use the project's session-pooler Postgres URI.
   URL-encode the database password and quote the complete value in `.env.local`.
   The bundled public Supabase CA verifies TLS and the pooler hostname. The Node
   client uses a maximum of two connections and disables prepared statements.
3. Run `npm run db:admin` once in each target database. It applies the checked-in
   additive migration in a transaction, under an advisory lock, and is safe to run
   again. It never deletes or changes existing interview/account data. It does not
   alter Supabase's migration-history tables. If managing migrations through the
   Supabase CLI, apply the same file there instead; do not apply it twice.
4. Add `ADMIN_USER_ID` and the restricted `SUPABASE_REPORTING_CONNECTION_STRING` to the intended Vercel environment and deploy. Do not add the operator migration URI.
   Local `.env.local` changes do not configure Vercel. Optional `ADMIN_TEST_USER_IDS`
   is a comma-separated list of test-account UUIDs.
5. Sign in normally, then visit `/admin`. Admin sign-in returns only to the fixed
   same-origin admin route. APIs return 401/403 rather than redirecting.

Every page and admin API independently checks the owner against a freshly
verified `auth.getUser()` response. Dashboard/API responses are private and
uncached. Invitation updates require same-origin POSTs, JSON with a 1 KB size limit,
and strict email/boolean validation. Reporting APIs remain GET-only. The
`interview_admin` schema is not exposed through the Data API. Reporting tables
have RLS and no browser table grants; the invitation exception is described below.

## Approving beta users

1. Sign in with the configured admin account and open `/admin/access`.
2. Newly registered accounts appear under **Awaiting approval**, newest first.
   Click **Approve** beside the account. The entry moves into Invitations as
   approved. Alternatively, enter a Google email under **Invite by email** before
   the person signs in. A new approval sends a notification from
   `MockMeAI <hello@mockmeai.com>` through Resend.
3. They can refresh or sign in. **Revoke** withdraws access on their next protected
   request without deleting their account or saved interviews.

The private `interview_admin.beta_invites` table stores one normalized email per
row, approval state, server timestamps and the admin who last changed that state.
Retries preserve the original creation time and do not create duplicate rows.
The configured admin always has access independently of the table.

The pending list reads the existing registered-account projection; it does not
create duplicate signup records. Accounts with an existing invitation, including
an explicit revocation, do not reappear as pending. The configured admin is excluded
because their access is automatic. Search covers both lists, which have separate
pagination controls. Existing approvals, accounts and saved interviews remain intact.

### Approval emails

Verify `mockmeai.com` in Resend and add a **sending-only** `RESEND_API_KEY` to
`.env.local` for local work and Vercel **Production** for the deployed app.
The key is server-only. The verified sender is `hello@mockmeai.com`; no mailbox
or Supabase Auth SMTP change is required for these outgoing notifications.
Sending does not change the Google OAuth test-user list.

Run `npm run db:admin` before deploying this version. The additive
`20261109011503_beta_approval_emails.sql` migration creates a private outbox.
Approval and its notification record commit in one transaction. Only an actual
transition to approved queues an email. A repeated Approve request, refresh,
revocation or page read does not create another notification. Existing approved
accounts remain unchanged and are not automatically emailed. Re-approval after
revocation creates a new approval notification.

The Access page shows the email status beside the invitation. **Sent to email
provider** means Resend accepted the request, not proof of inbox delivery. Check
Resend for delivery/bounce details. Failed/pending sends offer **Retry email**;
the access grant stays valid. Retry accepts only a notification UUID and uses
fresh owner authentication, same-origin checks and the stored recipient/template.
No public send-email endpoint is added.

The outbox freezes sender, recipient, subject and body so retries submit exactly
the same request with an idempotency key tied to the notification UUID. A 30-second
database lease blocks parallel sends and permits recovery after an interrupted
request. Resend deduplicates for 24 hours, so API retries stop after 23 hours from
the first attempt to avoid duplicates after that window. Older unconfirmed
attempts say **Delivery unconfirmed** and require checking Resend. There is no
background retry worker or delivery webhook in this MVP; refresh the Access page
and retry there. Revoked/superseded notifications cannot be retried; an email
already accepted cannot be recalled.

Only the restricted runtime role can read/write outbox rows. Browser candidate
roles have no grants, and RLS is enabled. The database stores message IDs,
timestamps, bounded failure categories and debugging references; logs contain
references/categories only, never recipient addresses, API keys or email bodies.
The approval email contains no interview answers or drawings. Unit/API tests
stub sending, and the opt-in live database test rolls back its fixtures without
sending email.

Candidates call the no-argument `is_beta_invited()` RPC with their existing Auth
session. This SECURITY INVOKER function returns only their own membership boolean.
Authenticated roles have schema USAGE and SELECT on only the invitation email and
approval columns, restricted by an own-verified-JWT-email RLS policy. They cannot
read another email, audit metadata or reporting tables, or insert/update invitations.
Anonymous users cannot call the function. Admin writes use the existing restricted
runtime database role. No service-role key is added.

Run `npm run db:admin` before deploying. It imports a locally configured legacy
`MOCKMEAI_INVITED_EMAILS` list with `ON CONFLICT DO NOTHING`; existing rows, including
revocations, win. Remove the old variable after import. Runtime checks never read it.
For another environment with legacy invitees, import its emails before retiring
its list. Verify permissions with `node scripts/verify-beta-invites.mjs`; all test
writes roll back. Approvals share the existing database across environments using
that project. Google OAuth test users and Vercel protection remain separate gates.

## Definitions and coverage

- **Registered users:** current, non-anonymous, non-deleted Supabase accounts,
  all time. **New signups:** the same accounts created in the trailing 7 days.
- **Active in the last 7 days:** distinct users with a persisted interview action
  during that window: start (including a failed authenticated start attempt), accepted candidate turn/control, completion, explicit exit, or an uncached feedback attempt.
  Browsing Home/admin, refreshing a cached result, and resuming do not update last activity. Actual feedback retries do.
- **Started:** recorded sessions that successfully started. **Failed to start:**
  recorded authenticated start attempts that failed, including failures before an interview ID exists. Later AI or feedback failures
  never change an interview to failed. **Completed:** the server froze an ending,
  even if feedback is pending or failed. **Exited:** an existing Close without
  scoring action was recorded by the server. **Unfinished:** no explicit outcome
  has been persisted. Inactivity never means failure.
- Interview outcomes, durations and costs cover **all recorded data in the current
  environment** (`VERCEL_ENV`, otherwise development/production). The UI labels
  each metric, the seven-day window, reporting start, and UTC timestamps.
- The configured admin account, configured test accounts, and 1-minute tests are
  excluded by default. Include admin/test activity is a read-only report filter.
  Account totals use the shared Auth registry; interviews/costs use environment
  scope. A test account should be listed in `ADMIN_TEST_USER_IDS`.
- **Elapsed interview time:** server start to the first completion/explicit exit,
  in minutes and seconds. Feedback latency is excluded. Drawing pauses questions,
  not the timer, so there is no paused time to subtract. Resuming never replaces
  the original start. This does not measure active engagement.
- Open interviews are shown as unfinished. Their elapsed-so-far estimate stops at
  their last recorded action; there is no heartbeat, online presence heuristic,
  or running abandoned-session counter. No known activity/timing means unavailable.
- **Average completed duration:** completed sessions with both valid start/end
  values only. Exited, failed and unfinished sessions and missing/invalid timing
  are excluded. An empty sample is unavailable, not a zero-second average.
- User counts mean recorded attempts, including failed starts with an interview
  ID. Lists are searched by email and paginated in stable batches of 20.

Redis still holds short-lived canonical interview state; IndexedDB still holds
browser history and drawings. The private tables keep only operational metadata,
selected feedback fields, failure references and model usage. On successful
resume, verified timing/outcomes/feedback can be recovered into reporting, labeled
partial. No browser database is scanned, deleted, or migrated. Old browser-only
interviews, expired Redis records, previous model usage, and unknown first-action
milestones cannot be reconstructed and remain unavailable.

## Reliability, privacy and debugging

A small shared helper records start, first candidate response, design presentation
when supported, completion/exit and feedback outcomes. Milestone timestamps use
first-write preservation; interview IDs and failure/request IDs deduplicate
replays. Accepted turns update last activity, not every click/keystroke. Reopening
or refreshing does not insert another interview or milestone. Each actual model
retry is a separate AI call, not a new interview.

Authoritative completion is recorded after the existing shared-session freeze and
before grading. Feedback status is separate. Feedback projections reuse validated
summary/area scores/rationales and findings without copying candidate quotes,
full transcripts, drawings, images, or raw provider responses.

Failures record operation, category, timestamp, interview/account IDs when known,
and request/reference IDs. Correlate the request ID with the existing server JSON
logs. Browser storage failures are explicitly labeled browser-reported and are
associated only with a matching owned reporting record. Browser reports cannot
supply server outcomes or change status/scores. No secrets, full answers or raw
audio are logged. Diagnostic logs retain allowlisted status/error categories.

Tracking errors never reject an interview operation. Writes have bounded database
timeouts and back off for 30 seconds after an outage; failures are logged. This
is best-effort reporting of persisted evidence, not a lossless event pipeline.
A database/read failure displays unavailable, not zero. An offline local close or
save error that never reaches the server cannot be guaranteed in the dashboard.

## AI cost

Each provider attempt records the operation, model, start/end, result status,
request/interview references and reported input/output/cache token counts. Stream
terminal events provide usage; failed provider requests retain usage when it is
returned. SDK retries remain disabled; the existing bounded retry is observed as
another call. Reporting never records model request bodies or generated answers.

Default standard USD/million rates for `gpt-6.1-terra` are input 1.00, cached input
0.05, cache writes 1.25, and output 5.00, verified against
[OpenAI's Terra model page](https://developers.openai.com/api/docs/models/gpt-6.1-terra).
Default rates for `gpt-6.1-sol` are input 2.00, cached input
0.10, cache writes 2.50, and output 10.00, including reported reasoning tokens
in the output total. See [OpenAI's Sol model page](https://developers.openai.com/api/docs/models/gpt-6.1-sol).
Cache-read and cache-write tokens are removed from ordinary input before pricing;
they are not counted twice. The app uses standard service with default cache
retention and bounded inputs below the long-context pricing threshold.
Default rates for `gpt-4o`, `gpt-4o-2024-08-06`, and
`gpt-4o-2024-11-20` are input 2.50, cached input 1.25, output 10.00, checked against
[OpenAI's model page](https://developers.openai.com/api/docs/models/gpt-4o) on
2026-11-06. Set `AI_MODEL_RATES_USD_PER_MILLION` to a complete JSON rate map for a
custom model or negotiated pricing. The rate version is saved with each estimate;
changes affect future calls, not existing estimates. Cache-write usage without a
configured price is unpriced.

Totals include known priced failed/retried attempts and show the number of
unpriced calls. Missing usage/pricing is never zero. No recorded calls is distinct
from missing usage. Costs are estimates for recorded provider calls, not invoices,
credits, taxes, discounts, or costs before tracking began.

## Verification

`npm run check` covers auth/authorization, safe filters, time definitions, pricing,
privacy, per-attempt usage/retry instrumentation, and existing interview regressions.

`INTELIPREP_ADMIN_DB_TEST=1 npm test -- tests/admin-database.test.ts` runs an opt-in
integration check using the real private schema. It creates a test user and
interviews inside one transaction and rolls back only those fixtures. It checks
counts, preserved starts/endings, partial timing, completed/failed-feedback status,
exit replay and ownership, abandoned duration, deduplication, cost coverage,
search/exclusions, and browser-role denial. It sends no emails or model requests.

Not tracked: replay/heatmaps/click trails, live presence, raw answers/audio,
voice analytics, abandoned-tab exit guesses, durable transcript synchronization,
alerts, custom charting, PostHog, or Sentry.

## First-visit metric

The **App reach** panel prominently reports identified signed-in accounts and
accounts with their first recorded visit in the trailing seven days. A verified
Supabase account is counted once per environment, across browsers and devices.
This measures accounts, not guaranteed distinct people. It uses the existing
admin/test exclusion filter; if two known visitors are the owner and one candidate,
the default account count can correctly be one. Registered accounts remain a
separate metric. Earlier unrecorded visits are unavailable.

The dashboard no longer displays historical browser-ID counts. Their persisted
records remain intact for compatibility. Signed-out QA, deployment screenshots,
automation and different browser profiles can inflate them. Existing anonymous
records cannot be retrospectively identified or reliably removed as tests.
No records are deleted or manually adjusted to an assumed number of people.

The additive `20261107221500_app_viewer_reporting.sql` migration creates the private
`interview_admin.app_viewers` table. Run `npm run db:admin` in each target database;
the command also applies this migration when the original reporting schema exists.
No additional environment variables or external services are needed.

A random browser UUID lives under `mockmeai:app-viewer:v1` in localStorage. Only its
SHA-256 hash, environment, first-seen server timestamp, exclusion flag and optional
verified account reference are persisted. Refreshes and retries cannot increase
the browser count or reset first-seen time. The tracker resends its existing
browser ID on initial authenticated sessions and sign-in events, including on
the not-invited or admin page. Identity always comes from verified server claims,
never the browser request. Signing in can link a browser to an admin/test
account and exclude it retroactively. The public write-only endpoint is same-origin,
size-bounded and rate-limited; `/api/admin/visitors` uses the existing owner check.
Reporting remains best effort and never blocks interviews.

The additive `20261109180853_identified_app_visitors.sql` migration adds the private
`app_visitor_accounts` table, keyed by environment and verified account ID. It
imports only existing identified account links, retaining their earliest recorded
visit, and preserves every old browser record. Run `npm run db:admin` before deploying.
Separate account records also count multiple accounts using the same browser.

Known bot/headless/screenshot user agents are ignored by the endpoint; the client
also skips webdriver-controlled browsers. These are measurement filters, not
proof of humanity or a security boundary. No raw user agents or IPs are stored.
For QA using a regular shared browser, set
`localStorage.setItem("mockmeai:exclude-analytics", "1")` before navigating to app
entry pages. Remove that one key to resume tracking. It does not alter account
access, saved interviews or drafts. Production smoke tests must opt out or block
the tracking request; isolated CI clears the reporting connection entirely.

This measures browsers, not exact people. Clearing storage or switching browsers
can count a person again; blocked storage and failed requests can miss visits.
There are no raw IP records, browsing trails, referrers, heartbeats or session replay.
Nothing before tracking started is backfilled. Missing database data is displayed
as unavailable, not zero.

## IP-address comparison

The dashboard also shows distinct **IP addresses** across all newly recorded visits
and addresses seen in the last seven days. The recent window uses last-seen time,
so returning addresses are included. This is a comparison of connections, not a
count of people or a conversion rate: Wi-Fi/NAT can combine people, and changing
networks/VPNs can split one person. The account metric still measures identified
accounts. Prior browser IDs cannot be backfilled into this comparison.

Run `npm run db:admin` to apply the additive
`20261109184934_ip_visitor_comparison.sql` migration. No old records are changed.
Generate a dedicated `VISITOR_IP_HASH_SECRET` once with `openssl rand -hex 32` and
configure it as a server-only sensitive **Production** variable in Vercel. Keep it
stable; rotating it changes the pseudonyms and prevents cross-key deduplication.
Do not reuse the resume secret or provider keys. Localhost does not supply a
trusted platform IP and shows the comparison as unavailable. Missing configuration
or a failed IP query shows unavailable, while an enabled empty dataset shows zero
and “No eligible IP visits recorded yet.” Account counts remain available if only
the IP comparison fails.

The server reads only Vercel's `x-vercel-forwarded-for` when `VERCEL=1`, validates
and canonicalizes IPv4/IPv6, and computes an HMAC-SHA256 pseudonym. Arbitrary
client IP fields and forwarded headers outside Vercel are not accepted. The raw
address is never put in application logs, SQL, browser responses or reporting.
The private RLS-protected table stores only environment, hash, first/last server
timestamps and an admin/test classification. No account ID or device fingerprint
is stored in this table. Records remain until operator removal; the hash is
pseudonymous, not a claim of fully anonymous data.

Known automation is skipped before recording. Admin/test events are classified
from verified identity/local testing; an existing excluded browser also stays
excluded after sign-out. Separate classified rows allow an ordinary visitor to
share an admin's public IP without disappearing from the default comparison.
Including admin/test activity counts each address only once across both groups.
Signed-out testing in an unidentified browser can still count, so QA must opt out.
First/last timestamps are server-owned and repeat visits preserve the original
first-seen value. No periodic heartbeat or additional tracking requests are added.

## Restricted runtime database role

The web app uses **only** `SUPABASE_REPORTING_CONNECTION_STRING`. It never falls
back to `SUPABASE_CONNECTION_STRING`, which is reserved for operator migrations.
Do not configure the privileged migration URI in Vercel runtime environments.

1. With the operator URI in local `.env.local`, run `npm run db:admin` to create
   `mockmeai_reporting` and its restricted grants/policies.
2. Run `node scripts/configure-reporting.mjs` once. It generates a random role
   password and writes the session-pooler URI to `.env.local` without printing it.
   It preserves the project suffix in the pooler username, changing
   `postgres.<project-ref>` to `mockmeai_reporting.<project-ref>`. It refuses to
   rotate a connection already configured locally. No password is in a migration.
3. Run `node scripts/verify-reporting-role.mjs`. It verifies reporting reads and
   writes, rejects secret Auth reads, unrelated table access, deletes and schema
   creation, and rolls back its test writes.
4. Set the restricted URI as sensitive server-only
   `SUPABASE_REPORTING_CONNECTION_STRING` for Vercel Preview and Production.
   Remove the old privileged URI from Vercel, then create new deployments. Keep
   the migration URI only in your operator environment. Never paste either URI
   into chat, commits or browser configuration.

The role has schema USAGE and SELECT/INSERT/UPDATE on the private reporting
tables, with role-specific RLS policies, no DELETE, no schema CREATE, no role
management and no BYPASSRLS. Browser roles still have no reporting access.
It receives SELECT privileges on only id/email/created_at of auth.users.
Supabase controls USAGE of the managed auth schema, so app queries use the private
`registered_users` view instead. This fixed three-column, owner-evaluated view
preserves the existing anonymous/deleted-account filter without granting the role
access to those status columns or Auth secrets. It is inaccessible to browser
roles, SELECT-only for reporting and deliberately non-updatable. Do not expose it
through the Data API or grant it public access.
# Practice feedback

Candidates can answer or skip a short survey on results, including interviews
that are too short to score, or use **Send feedback** in their account menu.
Feedback never enters model requests or diagnostic logs and never gates scoring.
The results survey optionally asks whether candidates prefer Talk, Type or No
preference, after the existing practice-again question. This records a preference;
it does not enable voice input. Feedback can still be sent without answering it.
`POST /api/feedback` uses candidate authentication, current invitation checks,
same-origin enforcement, a 4 KB strict JSON boundary, and per-account limits of
5/minute, 30/hour and 60/day. Comments are trimmed and limited to 2,000 characters.
The byte limit also applies to multibyte text.

Run `npm run db:admin` with operator credentials to install the additive
`20261109194452_practice_feedback.sql` migration. Existing interviews and
scorecard feedback are unchanged. Only the restricted reporting role has access
to the new RLS-protected table. Candidates must own the persisted interview to
submit its survey. Repeated submissions update the existing user/interview row;
account-menu submissions have no interview and remain independent entries.
Send/Skip dismissal is stored server-side and cached under an account-scoped
localStorage key, without storing the comment there.

Read feedback at `/admin/feedback`. Summary counts and the 20-entry pages use the
current environment, email/comment search and exclusion filters. Answered and
skipped totals count interview-end records only; menu entries are shown
separately. Choice counts include all non-skipped submissions. The totals do not
measure all completed interviews or people who never submitted the card. A
second answer replaces the first, without changing its original creation date.
Practice feedback also appears alongside interviews under `/admin/users/[id]`.
The page and direct read API re-check the configured admin identity. Comments
are rendered as plain text. No feedback is emailed or sent to an AI provider.

### Optional input-preference migration

Before testing the updated beta feedback form, apply
`supabase/migrations/20261111073325_feedback_input_preference.sql` to the app's
Supabase database. This migration is prepared in the repository, not automatically
applied to the shared database by a Vercel deployment.

- With the existing operator connection in `.env.local`, run `npm run db:admin`.
  The migration runner includes this file and applies its changes transactionally.
- Alternatively, open the IntelliPrep project in Supabase, open SQL Editor,
  paste this migration file, and run it. No API key or database password should be
  pasted into chat.

The migration adds nullable `input_preference`, validates the three choices and
allows that optional answer to be the only submitted answer. It replaces only
the response-presence constraint. Existing feedback and its RLS/grants remain
intact, and older rows keep a null preference, shown as Not answered. Summary
counts at `/admin/feedback` use the same search, environment and exclusion filters
as other feedback counts and exclude skipped records. User interview details
also show the saved preference. Existing production code can ignore the new column.

Browser CI now starts a temporary PostgreSQL cluster with synthetic accounts,
strict TLS and the actual reporting-role grants. It exercises feedback ownership,
upserts, skips, rendering, search and admin denial without production credentials.
`SUPABASE_REPORTING_CA_FILE` optionally supplies a trusted CA for this isolated
database; the default remains the checked-in Supabase root. TLS verification is
always enabled. The temporary cluster is removed when the runner shuts down.
# Beta funnel

Open `/admin/funnel` to filter all seven beta milestones by inclusive UTC calendar
dates and email, with per-user counts and admin/test exclusions. Counts use
persisted server records. Only the three missing milestones have a new private,
RLS-protected `beta_funnel_events` table. Signed-in Auth sessions, interview
eligibility and visible assessed scorecards are idempotent; the other steps reuse
existing interviews and non-skipped feedback. New-milestone history starts at
`reporting_state.beta_funnel_since` and is not backfilled. See
[beta readiness](beta-readiness.md#beta-funnel-definitions) for the exact definitions.

## Owner account protection

The admin identity remains one verified Google account. In Google Account,
Security, How you sign in to Google, enable a passkey or 2-Step Verification and
keep recovery methods current. This is an owner action, not an app setting.
Never share the account or recovery codes with a testing agent.

Anonymous visitor ingestion has a shared UTC-day budget of 2,000 new browser
identifiers and a separate 2,000 new IP-comparison identifiers. Existing records
may still be updated, and verified account reporting continues when the anonymous
browser budget is full. Reservations are atomic in Redis; a failed insert can
consume a reservation conservatively. The per-network endpoint limit is 50 per
day. IPv6 anonymous quotas share a /64, while the optional IP comparison retains
full-address keyed hashes. These protections do not identify unique people.
