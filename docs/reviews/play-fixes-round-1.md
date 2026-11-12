# Play fixes, round 1

## 1. Written grading

Vercel Preview logs on November 12, 2026, at 01:00:31, 01:00:44 and 01:01:05 UTC
show `drill:failed` calls for `gpt-6.1-terra`, followed by provider status 401.
The model calls lasted 71 to 409 ms. Successful non-AI submissions around
01:01 to 01:02 confirm that deterministic grading and saving still worked.
The blocker is provider authentication, not a timeout or the daily quota.

The agent did not change environment variables. In Vercel, open **inteliprep → Settings →
Environment Variables**. Update **OPENAI_KEY**, targeting **Preview**, with a
valid key for the configured AI provider. Keep Production unchanged. The next
beta build must include the updated Preview setting. Never paste the key into
an issue or commit it.

Written grading now distinguishes provider failures, incomplete output and
invalid output. Logs include the safe provider code when recognized, the request
reference and server frames. Validation logs contain an issue count, not values.
Candidate responses keep a generic service message and preserve their saved
answer. A provider 401 never invalidates the candidate's login.


The owner updated Preview's key and the beta was rebuilt. A single permitted
live retry returned HTTP 200 in 4,987 ms, with a normal failing grade for the
previously saved answer. Request reference: `09e3998a-5a11-4d34-90a2-68ae4329b7dc`.
No additional live grading is needed for this round.

## Changes by item

| Item | Change | Main files |
| --- | --- | --- |
| 2 | Sign-in explains account-saved progress. | `src/app/sign-in/page.tsx` |
| 3 | Removed internal bank-status notes. | `src/app/play/page.tsx`, `src/app/play/[topic]/page.tsx` |
| 4 | Wrong answers say Not quite, omit zero points and explain the review. | `drill-card.tsx` |
| 5 | Locked levels explain the previous level to pass. | `game-icons.tsx`, topic page |
| 6 | Previously opened drills show Resumed beside their original timer. | `round-store.ts`, `public.ts`, runner and card |
| 7 | Added normal spacing after Saved mock interviews. | `src/app/mock/page.tsx` |
| 8 | Start returns its first public view; a persistent Play layout and request-local dedup remove repeated loading work. | `rounds.ts`, `database.ts`, `access.ts`, `player.ts`, Play layout, `round-prefetch.ts`, `start-round.tsx`, runner |
| 9 | Connected level path with passed, current and locked nodes. | `level-path.tsx`, CSS Module, topic page |
| 10 | One progress dot per drill, using server outcomes. | `round-dots.tsx`, `round-store.ts`, `rounds.ts`, runner |
| 11 | Large earned points fly to the server-total counter; streak has a flame. | `earned-points.tsx`, `play-rewards.tsx`, `mode-nav.tsx`, `totals.ts`, `submit.ts` |
| 12 | Complete screen shows score, total points, all earned badges and the next open level; failure lists review drills. | `round-summary.tsx`, `pass-confetti.tsx`, `summary-store.ts`, `completion.ts`, `rewards.ts` |
| 13 | Daily-goal ring uses completed rounds in the stored account time zone. | `daily-goal.ts`, `daily-goal.tsx`, player totals, nav |
| 14 | Multiple choice supports 1 to 4 and Enter; results focus Continue. | `keyboard-play.ts`, answer form, drill card |

Component paths without a directory are under `src/components/play`. Server paths
without a directory are under `src/lib/play`. New styles use CSS Modules and the
existing palette tokens. All celebrations respect reduced motion.

## Timing and compatibility

Before item 8, a regular signed-in Preview click took 1,996 ms to show the saved
first drill: 628 ms for start plus a 452 ms follow-up round GET. That observation
had one GET, rather than the intermittent two in the report. The revised start
response eliminates the follow-up GET. Known time zones also skip the redundant
profile POST. The isolated browser test asserts one POST, zero GETs and zero
profile requests during a fresh start. Measure the actual cloud delay again on
the published Preview; sub-500 ms is a target, not a guaranteed service time.

The public-view handoff is owner-scoped, expires after a minute and is discarded
after navigation, so returning cannot replay an outdated first question. Direct
reloads still load the authoritative server view.

No database migration is needed. New summary fields are optional for old results;
old totals are calculated from saved attempts without rewriting them. Progress,
points, level unlocks and daily-goal decisions remain server-owned. A failed
round counts toward the daily goal, while an unfinished round does not.

## Verification

Run `npm run check` and `npm run build` after each item. The build scans client
chunks for private content. SQL tests cover retry-safe rewards, saved timing,
ownership and daily-goal boundaries in the player's time zone. Browser tests use
isolated Auth, SQL and model fixtures and make no real model calls. They cover
the path, start requests, wrong and correct answers, pass/fail summaries, rewards,
daily goal and keyboard play, with screenshots at 1,440 and 375 pixels.

The connected real browser has a Vercel-toolbar iframe warning from the existing
frame-blocking CSP. The app's frame policy is intentionally unchanged.
