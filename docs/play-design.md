# Play beta design

## Existing app

Home is `/`; setup is `/interview/new`; live sessions and results are
`/interview/[id]` and `/interview/[id]/results`. `/interview?session=...` keeps old
links working. Admin has Overview, Users, Access, Funnel and Feedback.

`candidateIdentity` verifies Supabase claims; `requireCandidateInvite` checks the
own-email `is_beta_invited` RPC, with the configured admin checked separately.
`withApiRequest` checks identity, invitation, origin, request quotas and account
consistency. Existing history stays in account-scoped IndexedDB. Redis owns live
Mock transcripts. Neither store is changed by Play.

Private reporting uses `interview_admin` and the restricted reporting login. Its
invitation, feedback, usage and admin policies stay intact. Play uses a separate
private `practice_game` schema and the existing server database connection.

`observedModelRequest` wraps provider calls with usage, latency and failure
records. Short-drill grading reuses that wrapper and strict structured output.
Its answers, formulas, expected mechanisms and rubrics stay server-only.

## Boundaries

- `src/lib/play`: public request/response schemas, private content, pure rules,
  transactional storage, grading and commands.
- `src/components/play`: topic map, level list, runner, results and progress.
- `/api/play`: thin authenticated handlers. The client sends answers and stable
  request IDs, never outcomes, points, dates or unlocks.
- `/mock`: the existing picker. Old interview routes and the interview engine
  remain available. One completion hook consumes only verified server scorecards.
- `BRAND`: the name, domain, tagline and public identity in one place. Persistent
  cookie, Redis and browser-database names remain compatibility identifiers.

## Storage

The requested tables are `drill_attempts`, `level_progress`, `topic_readiness`,
`streaks`, `points_ledger`, `review_queue` and `badges`. Add profiles for the chosen
level and IANA time zone, sessions for server-picked order and five-answer results,
events for deduplicated analytics, and daily usage for the AI cap.

Attempts store their server-generated variants before returning a public prompt.
Ownership and session membership are checked on every read and write. Grade
claims expire so interrupted requests can retry. Finalization, ledger entries,
streaks, reviews and unlocks commit atomically. Unique references make retries
return the stored result without duplicate points or events.

RLS restricts access to the verified user's rows. Browser roles cannot directly
write score or reward tables. Server transactions set the verified user context;
the runtime role has no RLS bypass. This preserves own-account writes through the
API while preventing direct reward edits.

The server supplies current time. The account's time zone defines calendar days.
Readiness records include the verified Mock level, so a Mid-level result cannot
claim the Senior bar. Stale readiness is reduced on reads and meaningful actions.
Reading primers or gap cards never changes points, streaks or readiness.

## Alternatives

Extending IndexedDB would make browser edits authoritative for rewards. Using
Redis alone would lose long-term readiness and streaks. Keep Mock's transient
engine intact and use Postgres transactions for the game.

## Content and checks

RAG has four configured levels and all four drill types. Each level has eight
authored drills from `docs/play-content/rag-levels-1-2.md` and
`docs/play-content/rag-levels-3-4.md`. New rounds never select placeholders.
Saved attempts retain their definitions and variants; due reviews can restore a
retired drill from its owner's saved snapshot. No saved attempts or passes are
rewritten. Multiple-choice positions are shuffled per attempt. Math uses a 15%
tolerance, except exact integer node counts. Placement uses the first two
configured placement drills in each of Levels 1 to 3.

Tests use stubbed AI responses. Pure tests cover tolerance, pass/unlock rules,
time zones, freezes, reviews and readiness. Database tests check row ownership,
retries and concurrent submissions. The production bundle scan rejects private
drill content. Preview smoke testing must not make paid grading calls without
an approved budget.
