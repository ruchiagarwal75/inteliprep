# Play beta

The product identity lives in `src/lib/brand.ts`. Signed-in visitors start at
`/play`. Mock keeps the existing interview routes and scoring. No existing
interviews are deleted or rewritten.

## Read-first findings

The original candidate pages were Home, Brief, live interview and results, with
admin overview, access, users, funnel and feedback pages. Google sign-in uses
Supabase claims. Candidate APIs also check the database-backed invite gate,
same-origin requests, account identity, request limits and body size.

Existing reporting and invite tables keep their policies. Play adds the private
`practice_game` schema. Owner-scoped server transactions and row security protect
all eleven tables. Browser accounts can read their own public result columns but
cannot write grades, rewards or private variants. Own-account writes go through
the authenticated API. No service-role browser client is added.

Written drill grading reuses the existing observed model client with a short
structured response. Math and multiple choice never call the model.

## Files by implementation step

| Step | Main files |
| --- | --- |
| 1. Read and design | `docs/play-design.md`, `docs/spec.md` |
| 2. Routes and navigation | `src/app/play/`, `src/app/progress/`, `src/app/mock/`, `src/lib/brand.ts`, `src/components/play/`, `src/components/candidate-account-provider.tsx`, auth return paths |
| 3. Storage | `supabase/migrations/20261111221816_play_game.sql`, `scripts/migrate-play.mjs`, `src/lib/play/database.ts`, `player.ts`, profile API, privacy page |
| 4. Drill engine | `src/lib/play/definition.ts`, `math.ts`, `question.ts`, `grade.ts`, `written-grader.ts`, `public.ts`, drill card and answer form |
| 5. Rounds and reviews | `rounds.ts`, `round-store.ts`, `submit.ts`, `completion.ts`, `review-policy.ts`, round/submit/next APIs, runner |
| 6. Rewards | `rewards.ts`, `streak-policy.ts`, `streak-store.ts`, `badges.ts`, `events.ts`, celebration component |
| 7. Readiness | `readiness-policy.ts`, `readiness-store.ts`, Progress page, target-level control, Mock prompt and prompt API |
| 8. Mock bridge | `mock-outcome.ts`, `mock-hooks.ts`, `log.ts`, interview start/end route hooks, Brief level preference |
| 9. Content | `docs/play-content/rag-levels-1-2.md`, `docs/play-content/rag-levels-3-4.md`, `src/lib/play/rag/`, `content.ts`, `gap-cards.ts`, gap card route |
| 10. Limits and analytics | `config.ts`, `ai-usage.ts`, `grading-policy.ts`, `spend.ts`, observed model operation tag, safe log fields, Play lifecycle events |
| 11. Checks | `tests/play-*.test.ts`, colocated Play tests, `tests/e2e/play*`, isolated Auth/model/SQL fixtures, private bundle scan |

Paths without a directory in the table are under `src/lib/play`.

## Content and rules

- RAG uses authored eight-drill banks for all four levels. New rounds contain
  no sample content. Saved rounds and reviews keep their original definitions.
- Full rounds draw five distinct drills. Four correct answers pass. Placement
  uses two drills from each of Levels 1 through 3 and can pass those levels.
- Multiple-choice options are shuffled per attempt. Public option IDs are
  positions, not the original correct option.
- Math accepts a 15% margin. Node counts must be exact integers. A stored
  definition and random variant preserve a round across content updates.
- Correct drills earn configured level points. Only the first completed full
  level round can earn the first-try bonus. Placement earns drill points and
  level unlocks, but no full-round bonus.
- Mock points are 100 times the mean assessed area score divided by four,
  rounded to a whole point. Missing timing and unscored sessions get no points.
  A passing verified RAG result promotes readiness at that actual interview
  level. Replays cannot award points or renew readiness again.
- Drills and reviews count for the streak. Mock completions, visits and gap-card
  reads do not. The first browser time zone is stored as an IANA zone. Freeze
  days preserve the streak without counting as additional practiced days.
- Only open topics count in the readiness denominator. Lower-level Mock passes
  do not prove a higher interview bar. Interview readiness expires after 21 days
  without topic activity. Earned badges remain historical milestones.

## Operations

Run `npm run db:play` with the existing operator database connection. It adds only
Play tables and policies. `npm run db:play -- --verify` checks installation.
The web runtime continues using the existing restricted reporting connection.
Do not expose `practice_game` as a public PostgREST schema or grant browser writes
to outcome columns.

`src/lib/play/config.ts` holds the 150-per-user daily AI grading cap and the
USD 5 daily spend log threshold. Quotas use UTC days; streaks use the player's
stored time zone. Failed grading attempts consume a quota slot. Cached results,
math, multiple choice and deterministic empty-answer failures do not.

The `play_spend_threshold` log includes the known estimated cost and a count of
calls with unknown usage or pricing. It checks existing usage records after drill
grading and logs at most once per server instance per UTC day. It is a log signal,
not an email alert or a billing total. Configure an external alert later if needed.
Analytics writes use a savepoint so their failure cannot roll back rewards.

Mock reward writes fail safely if Play storage is unavailable. Retrying the
verified end request can recover the reward; a cached reward never refreshes its
readiness timestamp. Browser-authored scorecards cannot award rewards.

## Verification

Run `npm run check`, `npm run build` and `npm run test:e2e`. The build scans browser
chunks for private Mock and Play content. SQL tests use embedded Postgres with
synthetic users and real policies. Browser tests use isolated fake Auth and model
services with real SQL. They never use a real model key.

The Play browser story covers placement, Level 1, all four drill types, Level 4,
points, streak, readiness, the Mock prompt, reload and account isolation. It saves
screenshots under the ignored `artifacts/play-beta/` directory at 1440px and 375px.
Existing Mock, feedback, theme, track and whiteboard checks remain in the suite.

Manual beta smoke: sign in, open RAG, complete placement, confirm Level 1 is passed,
then open Progress and confirm points and streak. The placement choices are
non-AI drills, so this smoke test does not spend model credits.
