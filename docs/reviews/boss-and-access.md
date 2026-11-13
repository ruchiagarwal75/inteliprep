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
