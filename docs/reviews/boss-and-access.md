# RAG boss and mock access

## Read-first findings

- `mockOutcome` in `src/lib/play/mock-outcome.ts` accepts a verified scorecard
  only when it has a session, is not limited or too short, has assessed areas,
  and does not have an `insufficient_evidence` signal. Its pass rule is exactly
  `signal === "yes" || signal === "strong_yes"`. Area averages determine XP,
  not whether the mock passes. The boss will use this unchanged rule.
- `observeMockCompletion` calls `applyMockOutcome` under the verified player's
  transaction. Its points ledger fences duplicate completions. A passing RAG
  card calls `recordMockReadiness`, which uses `afterVerifiedMock` to set
  `interview_ready`, preserves a higher verified level, and awards `rag-interview`.
- Course readiness comes from all non-primer topics passing. `recordDrillReadiness`
  returns a mock prompt; `MockPrompt` records an impression when visible and links
  directly to the interview Brief today. It will link to the boss on the RAG path
  instead. The boss always uses Mid and 45 minutes.
- Admin pages use `adminPageAccess`. Every admin data read or mutation also calls
  `requireAdminIdentity`, which revalidates with Supabase `getUser()` and compares
  the exact configured `ADMIN_USER_ID`. Editable metadata never grants access.

## Implementation design

Plan and boss entitlements will live in server-owned `practice_game` tables.
No plan row means Free. A verified configured admin is always Pro. A player's
transaction lock will serialize grants, free-attempt use, resets and retries.
The existing Redis start-request cache will still own session publication and
the original interview clock. A durable boss request record will reconcile
publication retries, including a response lost between Redis and Postgres.

Browser state will only display a public server projection. New starts go through
one access gate. Existing resume and result routes will retain their current
owner checks without a plan gate. Audit rows will record admin changes and
server-issued refunds, without transcripts or answers. Interest in Pro is a
single timestamp per user, with no email or payment integration.

A single entitlement row was considered for both access and session history.
Separate attempt rows preserve prior attempts and refund evidence after an admin
reset, and allow Pro retries without overwriting the earlier score.

## Scope and verification

Only fixture accounts will be used for QA. Interviewer and grader calls will be
stubbed. No owner progress, environment settings, main branch or Production
deployment will be changed. Hosted database migration status and test results
will be recorded here as the implementation proceeds.

## 2. Access model

`20261113200924_play_mock_access.sql` adds `mock_access`, `boss_attempts` and
`mock_access_changes` in `practice_game`, inside one transaction. All three have
RLS and owner-only browser SELECT. Browser writes are revoked. The restricted
runtime role uses the existing transaction-local owner policy. Audit entries are
append-only for that role. No existing tables or saved attempts are rewritten.

The admin user's detail page shows effective plan, free-attempt use, Pro interest
and recent audit entries. Plan changes and resets recheck admin Auth, validate
same-origin requests, and serialize with starts under the player's lock. Repeated
no-op changes do not add audit rows. The configured admin cannot lose Pro.

Local isolated Postgres verification passed default plans, fresh grants/revokes,
reset idempotency, interest deduplication, audit identity/times, owner isolation
and denied browser writes. The migration has not been applied to a hosted database.

## 3. Server start and fairness

All public interview creation goes through `withMockStartAccess` at the start
route. Free accounts must request the boss's fixed selection with `rag_boss`,
have a persisted Topic 9 pass, and have an unused attempt. Denials use the three
specified 403 codes. Pro/admin accounts retain normal mock selection. Deployed
one-minute starts require fresh admin verification, even if a test flag was set.
The old flag remains usable only inside stubbed unit tests.

The owner's transaction lock serializes new requests. Creation publishes the
canonical session with the existing Redis idempotency fence, then records the
attempt and free-use timestamp in the same Postgres transaction. Same-request
retries reuse that session. A durable replay cannot create another session after
the temporary cache expires. A failed publication rolls back the entitlement.
Resume, view, freeze and grading have no plan gate.

Trusted final response failures return an unfinished Free attempt and append one
audit entry. Browser error reports, cancelled requests, quota denials, inactivity,
completed sessions and scorecard failures cannot return it. A refunded session
remains resumable, consistent with the existing-session rule. End/freeze tracking
records the verified end before grading, so a grading failure cannot refund a
finished interview. Provider retries do not trigger refunds unless the final
response still fails. Audit rows store categories and IDs, never answer text.

The targeted server checks passed 24 tests: all Free restrictions, Topic 9,
concurrent and expired replays, original timing, Free resume, Pro/admin access,
fresh plan changes, publication rollback and one-time refund rules.
