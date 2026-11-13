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
and denied browser writes.

Hosted migration: the existing connection has been verified against app project
`bjqjocrfsiprlvnitfuo`; the course tables and restricted role exist and the new
access table did not. On November 13 the tested additive migration was applied
there with the existing operator connection. All three tables were verified with
RLS, owner-only authenticated SELECT, no anonymous reads and no browser writes. The
Supabase connector is unavailable in this session. This creates new tables in
the shared database; existing application tables and account progress are untouched.

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

## 4. Boss on the path

The final gate is below Topic 9. Its server projection has locked, ready,
in-progress, used, Pro-retry and defeated states. Existing running attempts take
precedence over a later plan/course change, so their Resume link stays available.
Past deadlines do not remain in-progress. Earlier defeats survive later retries.

The confirmation uses the fixed Mid/45-minute selection and the normal start/save
adapter. Its request ID survives retries and reloads. The existing practice-ready
prompt now links to the boss anchor. Anchor navigation takes precedence over the
path's initial topic centering. The gate sits outside the topic track container,
so adding it does not stretch the track between topics.

The gate and interviewer are shared pixel components. Interviewer pixels and
colors are copied from the supplied Boss art section of `welcome-intro.md`.
`build-boss-art.mjs --check` proves the generated grids match that source. Palette
values stay in `theme.css`; animation uses discrete transforms/opacity, pauses in
hidden tabs, and stops for reduced motion. The welcome flow itself is queued
separately. New boss dialogue stays within 12 words and 60 characters per line.

Eight targeted unit checks passed for all states, resume precedence, expiry,
past defeats, exact sprite grids/pigments, integer scaling and dialogue length.

## 5. Verified completion

A passing boss uses `mockOutcome` and the existing `applyMockOutcome` path,
without changing grading or XP. The stored signal drives defeat; the existing
verified-Mid readiness and `rag-interview` badge are awarded once. Course progress
is not reset after a failure. Progress retains its existing chosen-level rule:
a Mid pass validates Mid, rather than granting a Senior or Staff assessment.

The path reuses a shared World notice for the unlock and victory cards. The
victory claim is server-owned, serialized per account and persisted with a
timestamp. Two tabs cannot both win the first claim. The card can be dismissed,
auto-dismisses after 6.5 seconds and uses the existing reduced-motion CSS.

The prompt link keeps `from=play`; start attribution now recognizes both the
retired `rag` event namespace and the current `rag-course` namespace. Eight
targeted completion/readiness tests passed, including one-time XP/badges/claims,
failed-boss replayability and prompt-to-boss attribution. No model was called.

## 6. Scorecard practice links

Every RAG scorecard area below the existing 3/Solid display bar links to the
specified Learn topics, including Topic 0. Solid, Strong, unassessed and other
problems have no replay links. This navigation threshold does not decide boss
passing and does not change the grader. All seven current area titles are tested
against the mapping. Original quotes and evidence rendering are unchanged.

## 7. Free Mock views

The server chooses the Free catalog on `/mock` and `/interview/new`. All problems
show a lock and Pro label, and RAG links to its one free boss attempt. Pro/admin
accounts retain the original catalog and Brief. History, interview and results
routes retain their existing owner checks, with no plan gate.

Locked buttons, including Retry with Pro, open the same short interest dialog.
The candidate-protected, same-origin `/api/mock/interest` command accepts only an
empty bounded body and uses the feedback request limits. It records one timestamp
per user, shown on their admin detail page. It sends no email. Targeted tests
passed signed-out/invite/origin denials, owner selection, input bounds, 429 and
deduplicated storage.

## 8. Final QA

The final server tests use isolated Postgres, signed fixture identities and
stubbed provider failures. Admin API denials, fresh plan changes, reset audit
entries, continued resume after reset, and the final-error refund observer are
covered. Resetting a running attempt now marks its old attempt as returned before
clearing the slot. The old interview and verified checkpoint are kept.

Browser checks use local fixture Auth, Postgres and a fake model service. All six
node states, confirmation, both locked catalogs, interest, admin plan changes,
one-time World cleared and topic replay links passed in both themes at 1440 x 669
and 375 x 812. The real start/save/resume/end adapters were exercised without any
live model calls. Screenshots are in `artifacts/boss-and-access/`; they are local
QA artifacts and stay out of Git. Selected desktop and phone images were opened
and visually checked.

The first gallery run exposed a fixture-isolation issue: changing accounts in the
same browser context and navigating the same hash URL reused its old page.
Each state now uses a fresh browser context. The corrected four galleries and 32
existing Mock/Play/theme regressions all passed. The other seven new boss browser
checks passed separately. The regression includes timer expiry, unsent drafts,
45/60-minute mocks, white AI exports, course unlocks, Learn sizing, chest rewards
and progress. No owner account was used or changed.

All implementation items passed `npm run check` and `npm run build`. The final
check passed 2,032 tests, with two existing skipped tests. Verification also
includes the server-private browser-chunk scans. The default
Free plan is intentional: an operator can grant Pro on the existing admin user
detail page. Pro notification records interest only. No billing or mail was added.
No interview scoring, whiteboard behavior or existing progress was changed.
