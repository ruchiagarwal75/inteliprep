# RAG World boss and free vs Pro access

**Before you start:** commit the docs/play-content cleanup on its own: `git add -A docs/play-content` with the message "docs: archive finished play-content instructions". It only moves finished instruction files into archive/ and adds a README. Don't change anything else in that commit.

Ruchi's decisions (final):
- The RAG World boss is the existing mock `enterprise-rag-assistant`, always at **Mid** level, 45 minutes.
- A free user gets **one** boss attempt. Retries need Pro.
- All other mocks are locked for free users.

There's no payment system yet. "Pro" is a server-side flag that admins set. Don't add Stripe or any payment code.

Rules: fixture accounts only, no live model calls (stub the interviewer and grader in tests), no env or secret changes, no production deploy, no `main`, no em dashes. `npm run check` and `npm run build` per item, one commit per item, push `beta` at the end. Any migration is additive, wrapped in `begin; ... commit;`, keeps RLS on, and gives browsers read access to their own row only.

## 1. Read first, then report

Before building, add a short note to docs/reviews/boss-and-access.md covering:
- How a mock "passes" today: what `afterVerifiedMock` and `recordMockReadiness` need, and which scorecard field decides it. Use that exact rule for the boss. Don't invent a new pass rule.
- How the existing "mock prompt" after practice-ready works, and how you'll point it at the boss.
- How admin users are identified today.

## 2. Access model (server-side)

1. Add a plan per user: `free` (the default when no row exists) or `pro`. Admins are always treated as Pro.
2. Add boss attempt tracking per user: when the free attempt was used, and its session ID.
3. Admin panel: on each user, show the plan, a Free/Pro toggle, and the boss attempt status, plus a "Reset free boss attempt" button. Log every change with the admin's ID and time.
4. Never decide access in the browser. The UI only reflects what the server says.

## 3. Enforce on interview start

In `/api/interview/start` (and anything else that creates an interview session):
1. **Pro and admins:** no change from today.
2. **Free users can start exactly one thing:** `enterprise-rag-assistant`, level `mid`, 45 minutes, launched from the boss node, only after Topic 9 is passed, and only if the free attempt is unused. Anything else returns 403 with a clear code: `pro_required`, `boss_locked` or `free_attempt_used`.
3. **When the attempt counts:** at session creation. Retrying the same request (same requestId) must not count twice.
4. **Resume:** the user can always resume, view and see results for sessions they already have, on any plan.
5. **Fairness:** if the boss session ends because of a server-side error before the user finishes, give the free attempt back automatically, and log it.
6. The 1-minute test duration stays admin-only, as today.

## 4. Boss node on the RAG path

After Topic 9, add a large final node: "Final boss: Design an enterprise RAG assistant · Mid level · 45 min".

Draw the node as a pixel boss gate: a stone gate with a glowing door, in the world palette, built like the other pixel sprites. Make it one shared component, because welcome-intro.md reuses it. Its full description is in the "Boss art" section of welcome-intro.md. When the boss is defeated, the door opens. Any mascot or guide speech added for the boss follows the dialogue rule in welcome-intro.md: at most 2 lines, 12 words per line. Show the boss character from the "Boss art" section of welcome-intro.md (build it there if it doesn't exist yet): the idle pose beside the gate on the path node and on the confirm screen, and the defeated pose in the Defeated state. Use the boss lines listed in that same section for the confirm screen, the defeated state and the not-passed state.

States:
1. **Locked** (Topic 9 not passed): visible from the start, shows "Pass Topic 9 to unlock".
2. **Ready, free attempt unused:** a "Start boss" button opens a confirm screen: "This is your free mock interview. You get one free attempt. It takes 45 minutes, and you can resume if you get disconnected." Then it starts the mock with the fixed problem, level and duration.
3. **In progress:** "Resume boss".
4. **Free attempt used, not passed:** shows the score and "Retry with Pro".
5. **Pro, not passed:** "Retry boss" (no limit).
6. **Defeated:** "Boss defeated" with the date and score, plus "View scorecard".

Point the existing practice-ready mock prompt at the boss node instead of starting a mock directly.

## 5. Beating the boss

1. Use the existing mock pass rule from item 1. A pass at Mid calls the existing verified-mock path, so RAG readiness becomes "RAG interview-ready" and the existing `rag-interview` badge is awarded.
2. Show a "RAG World cleared" moment on the path, reusing the World unlocked component and its reduced-motion behavior. Show it once per account.
3. Not passing locks nothing. All topics stay replayable.

## 6. Scorecard links back to topics

On the scorecard of any `enterprise-rag-assistant` mock, under each area that scored below its pass bar, show "Replay Topic N" links:

| Scorecard area | Topics |
|---|---|
| Requirements and estimation | 0 |
| Ingestion and retrieval | 1, 2, 3, 4 |
| Grounded answers and citations | 5, 6 |
| Evaluation and quality | 7 |
| Freshness and reliability | 8 |
| Cost, operations and evolution | 8 |
| Safety and security | 9 |

Each link opens that topic's Learn page.

## 7. Locked mocks for free users

1. In the Mock tab and on /interview/new, free users see every problem with a lock and a "Pro" label. Past interviews stay listed and viewable.
2. The enterprise RAG problem says "Free once as the RAG World boss" and links to the boss node.
3. Clicking a locked mock opens a short modal: "Mock interviews are part of Pro. Pro isn't for sale yet. Want to hear when it is?" with a "Notify me" button. Clicking it records interest once per user, visible in the admin panel. No email is sent.
4. Pro users and admins see the picker exactly as today.

## 8. Tests

1. Server: a free user can't start any other problem, level or duration (403 with the right code); can start the boss once after Topic 9; gets `free_attempt_used` on a second start; isn't double-counted on a retried request; can always resume; gets the attempt back after a server-side failure. Pro and admin users are unlimited. An admin toggle takes effect on the next request.
2. Browser, fixture accounts, both themes, 1440 x 669 and 375 x 812: all six boss node states, the confirm screen, the locked picker and modal, "Notify me", the Defeated state and the "RAG World cleared" moment, and the scorecard topic links.
3. Existing mock and play tests still pass. The private-content chunk scan still passes.

## Report

Finish docs/reviews/boss-and-access.md: the item 1 findings, what changed, the migration (if any) with its RLS policies, tests, and screenshots under artifacts/boss-and-access/. Then push `beta`. Don't apply any migration to the database without saying so in the report.
