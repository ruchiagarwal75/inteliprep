# Open beta operations

## Access

Verified Google accounts have automatic access. Existing `beta_invites` decisions
are preserved: false blocks the next protected request, true and no row allow it.
There is no sign-in upsert that can undo revocation. The same server-checked
admin account can Revoke/Restore at `/admin/access`. Database outages fail closed.
Google OAuth's Audience test-user setting is separate. If it is still Testing,
the owner must publish it in Google Auth Platform for open signup. Keep the
existing client, secret, scopes and Supabase callback unchanged.

Free access still requires passing Topic 9 for one Mid, 45-minute RAG boss attempt.
All other new mocks remain locked. Existing interview history remains readable.
Per-user limits are unchanged: chat 10/minute, 120/hour, 200/day; starts 3/minute,
10/hour, 10/day; written AI drills 150/day. The existing shared model-call count
limits also remain in force.

## Shared Production AI budget

`src/lib/ai-budget-config.ts` owns a $5 warning and $25 daily shared cap, UTC day.
This includes paid admin/test calls as well as candidate calls. It is not $25 per
user. Preview and development do not spend from Production's ledger.

Every provider call goes through `observedModelRequest`. It reserves a conservative
upper estimate before contacting the provider, including cached-input writes,
image headroom, output and reasoning. Unknown model pricing fails closed. Text,
image and output limits bound the request. Retries are separate calls; cached
application responses make no call. No model, rubric or scoring weight changes.

Short Postgres transactions lock the day's budget across instances. New mocks
reserve $2 of headroom, with $0.75 protected for grading. Chat can use the rest and
request more from unallocated budget. Unused call funds return to the ongoing
mock; unused mock funds release after successful scoring, explicit exit, or
15 minutes beyond its deadline. A new UTC day has its own cap; old-day holds
cannot authorize new-day spending. A cap can pause unusually costly sessions,
including their feedback retries. The reservation is headroom, not an unlimited
promise to finish regardless of consumption.

Reported usage replaces a call reservation once. Missing usage, cancellation or
an interrupted accounting write keeps a conservative charge/hold, never zero.
Old deployments' reported calls are reconciled without double-counting metered
calls. Unpriced historical calls each reserve $0.75 as an explicit estimate.
Remaining funds can therefore differ from the provider's billed total. A billing
or SDK change needs a review of the conservative image/token bounds and configured
rates. The existing `AI_MODEL_RATES_USD_PER_MILLION` override is unchanged.

`/admin` shows spent, held, unknown-usage reserve and available budget. Budget
limits preserve saved work; reading, multiple-choice and math drills still work.
The same saved answer or scorecard can be retried when budget becomes available.

## Transactional emails

The existing Resend sender is `Shardling <hello@shardling.com>`. The existing
server-only `RESEND_API_KEY` is used without changes. No new environment setting
is required. Production delivery only. No emails are sent by local/browser tests.

- First successful app access: one welcome to the verified account email and one
  new-user alert to `ruchiii75@gmail.com`.
- Returning sign-ins, refreshes and retries: no new signup/welcome events.
- Estimated spend reaches $5: one owner warning per UTC day.
- Shared budget is spent or reserved and cannot accept work: one owner limit
  alert per UTC day. The email distinguishes spent and reserved funds.

The welcome and signup alert commit together with a unique per-account onboarding
marker. Existing approved accounts are baselined once on installation, with no
backfill emails. Admin/configured QA accounts are excluded. An explicit revoke
still blocks onboarding. No answers, transcripts or drawings are emailed or
logged. Email failure never affects access or completed AI results.

`interview_admin.notifications` is a private durable outbox. Sender, recipient,
subject and text are frozen per event. A 30-second fenced lease and stable Resend
idempotency key handle retries. The provider deduplicates for 24 hours; retries
stop after 23 hours, then show Delivery unconfirmed. Later signed-in visits retry
up to three pending events, at least five minutes apart per event. The owner can
also Retry email at `/admin/access`. There is no cron or guaranteed-time retry
worker. If traffic stops after an email failure, use the admin retry control.

Sent means Resend accepted it, not proof of inbox delivery. See Resend for delivery
or bounce details. Check domain verification and key permissions there if needed.
The old approval-email outbox is preserved, including its stable delivery keys.
Manual access restores still use that existing access-ready email path.

## Database rollout

All new tables use the private reporting schema, RLS and the restricted runtime
role. Browser roles have no notification/budget grants. Apply these additive
migrations with the operator connection, never the runtime connection:

1. `20261114014037_beta_notifications.sql`
2. `20261114014509_shared_ai_budget.sql`
3. `20261114015629_open_beta_access.sql`

For a staged release, install 1 and 2, deploy the guarded app from `main`, then
install 3 to open access. This avoids opening signup while old Production code
lacks the spending guard. `npm run db:admin` includes all three for future installs.
No secrets, history, progress or invitation decisions are deleted or renamed.

## Verification

Unit/integration tests use isolated Postgres and stub the provider and sender.
They cover concurrent reservations, deduplication, daily reset, unknown usage,
protected mock headroom, private tables, default access, revocation and first-login
email events. Browser QA uses synthetic local accounts. Never use the owner's
account to create test attempts or trigger welcome email.
