# Welcome intro

## Read first

Google sign-in returns to `/play`. The Play shell initializes a profile and time
zone but does not ask a first-visit interview-level question. The level picker
already lives on Progress, so the intro will not add another one.

The intro reuses the pixel Shardling asset, girl guide, world icons, chest, stars,
and the gate and Interviewer made for the boss. Content stays static and no AI
call is needed. Optional sound is omitted.

## 1. Account state

The additive `play_welcome` migration adds private `welcome_state` and
`welcome_runs` tables. RLS grants browsers only their own SELECT; writes use the
verified-owner server transaction. The first Skip or completion wins and stores
`welcome_seen_at`. A refresh reuses the automatic run; another browser reads the
same account state. Replay is a separate run and never resets progress.

Existing practice sessions, course visits, scores, XP or badges suppress the
automatic intro. A profile or time-zone initialization alone does not.

Hosted migration status is recorded below. Tests use isolated fixture accounts.

Item 1 passed the full check with 2,038 tests and the production build, including
private-content scans. Server tests cover cross-request suppression, replay,
concurrent/retried dismissal, owner isolation and denied browser writes.

## 2. Pixel story

The four scenes use the supplied character assets. Each quoted line gets its
own dialogue beat so it fits a phone text box. The revised story introduces
the purpose of the journey, explains RAG and practice with the guide, then
introduces the Interviewer as a mock system design interview challenge.
The shared gate, world emblems, girl guide, stars and chest are reused. The fixed
night palette is the same in both themes. The rest of the page keeps its chosen
theme. Pixelify Sans is self-hosted with its SIL license and a recorded hash.

No first-visit level picker existed, so no extra level question was added.
The existing Progress level picker remains available.

Item 2 passed the full check with 2,040 tests and the production build. The
content tests freeze the four panel titles and enforce the dialogue limit.

## 3. Input and accessibility

Enter or right arrow reveals the full line before advancing. Left arrow goes
back and Escape saves Skip. The native modal traps focus and gives every panel a
focused heading. A screen reader receives each whole line rather than every
typed character. Visual typing is 30 characters per second. Reduced motion shows
the whole line immediately, with no bob, wipes or blinking. Hidden tabs pause
typing and scene animation. Failed dismissal saves show a retry message and keep
the intro open.

Item 3 passed the full check and production build with 2,040 tests.

## 4. Measured actions

Intro shown, skipped, completed and first Topic 0 opens use the existing Play
event recorder. Skips retain the panel number. A client mount starts a protected,
idempotent POST, so RSC prefetch cannot count an intro as viewed. A saved dismissal
uses a fresh navigation so a prefetched Play redirect cannot reopen the story.
The first Topic 0 view is counted once per account after a completed own run.

The event migration adds nullable environment/test dimensions for old rows and
the four event names. No old environment is guessed. The admin funnel adds these
recorded action counts with the same date, environment, email and excluded-account
filters. Replay is included and labeled. Its data function rechecks admin Auth,
then sets a transaction-local SELECT flag for event metadata only. Browser grants
are unchanged; private drill data retains its owner policies.

The two welcome migrations are listed and verified below.

Item 4 passed 2,043 tests and the production build. Real isolated SQL checks
prove event deduplication, first-topic ownership, filtered counts, and removal
of the admin read flag after a transaction.

## 5. Browser QA

The first browser run passed 32 checks, including all 16 panel/theme/size views,
cross-browser Skip, Replay and the existing Boss/Mock/Play regressions. It found
a keyboard edge at the end of the dialog's Tab sequence, now closed explicitly.
Three test assumptions were corrected: Learn's existing heading includes Topic 0,
Next has a separate alert announcer, and unauthorized admin pages intentionally
return 404 while their APIs return 403.

Manual screenshot review also found a duplicated heading selector in the new
styles. Titles now use Press Start 2P as requested. The night scene has enough
height to keep world labels clear of the gate at both sizes. The dialogue remains
at most two rendered lines on phones. Focused controls remain visible.

Only isolated local QA accounts are used. Welcome fixtures use the real Free
default; existing Mock stories keep their test entitlement. No live model or
owner account was used, and no existing saved interview was changed.

### Hosted migration

On November 13, applied only these additive, transaction-wrapped files to the
configured Supabase project `bjqjocrfsiprlvnitfuo`:

- `20261113213647_play_welcome.sql`
- `20261113215525_play_welcome_events.sql`

Verified RLS, owner-only browser reads, denied browser writes and the scoped
backend event-read policy. The configured runtime role is `mockmeai_reporting`,
without superuser or RLS bypass. It sees none of these account rows without an
owner/admin transaction context. No environment value or secret changed. The
Supabase connector is unavailable, so verification used the existing pinned-TLS
operator and runtime connections, with metadata queries only.

### Final validation

All 13 welcome browser checks passed after the focus fix. The 23 existing
Boss/Mock/Play regressions passed in the preceding run. Screenshots cover all four
panels in both themes at 1440 x 669 and 375 x 812; selected images and the admin
funnel were opened for visual review. No horizontal scroll or dialog scroll was
found. Browser counters confirmed zero model calls for the intro and course flow.

The final verification commands are `npm run check` and `npm run build`, including
2,046 unit/integration tests and the private-content chunk scans. Two opt-in live
tests remain skipped. A temporary brand-inventory mismatch after editing this
report was corrected and its targeted audit passed before the final run.

Release scope is beta only. The Preview deployment is checked after pushing.
Production, the main branch, existing saved interviews and owner progress stay
untouched. Optional sound is not implemented. Replay is available in the profile
menu, including for existing players who skip automatic onboarding.

### Files by item

1. `welcome-store.ts`, `welcome-public.ts`, the protected welcome API/page,
   Play entry and profile menu, and the welcome-state migration.
2. `welcome-copy.ts`, `welcome-scene.tsx`, `welcome-intro.tsx`, its CSS Module,
   theme tokens and the self-hosted Pixelify Sans font/license/manifest.
3. `welcome-accessibility.ts` and `welcome-intro.tsx` for focus, keys and motion.
4. `welcome-session.tsx`, the start API, `play/events.ts`, the event migration,
   Topic 0 view attribution, `admin-welcome-funnel.ts` and the admin funnel panel.
5. `tests/welcome-*.test.ts`, `tests/e2e/welcome.spec.ts`, its fixture/helper
   updates, the brand inventory and this report. The authored intro spec remains
   in place because the shared boss-art generator reads its supplied grids.

### Screenshots

Local artifacts are excluded from Git.

| Panel | Desktop light | Desktop dark | Phone light | Phone dark |
| --- | --- | --- | --- | --- |
| Welcome | [Light](../../artifacts/welcome-intro/panel-1-light-1440.png) | [Dark](../../artifacts/welcome-intro/panel-1-dark-1440.png) | [Light](../../artifacts/welcome-intro/panel-1-light-375.png) | [Dark](../../artifacts/welcome-intro/panel-1-dark-375.png) |
| Learn | [Light](../../artifacts/welcome-intro/panel-2-light-1440.png) | [Dark](../../artifacts/welcome-intro/panel-2-dark-1440.png) | [Light](../../artifacts/welcome-intro/panel-2-light-375.png) | [Dark](../../artifacts/welcome-intro/panel-2-dark-375.png) |
| Interviewer | [Light](../../artifacts/welcome-intro/panel-3-light-1440.png) | [Dark](../../artifacts/welcome-intro/panel-3-dark-1440.png) | [Light](../../artifacts/welcome-intro/panel-3-light-375.png) | [Dark](../../artifacts/welcome-intro/panel-3-dark-375.png) |
| Quest | [Light](../../artifacts/welcome-intro/panel-4-ready-light-1440.png) | [Dark](../../artifacts/welcome-intro/panel-4-ready-dark-1440.png) | [Light](../../artifacts/welcome-intro/panel-4-ready-light-375.png) | [Dark](../../artifacts/welcome-intro/panel-4-ready-dark-375.png) |

[Admin funnel](../../artifacts/welcome-intro/admin-funnel.png)

## Narrative refinement

The automatic welcome and profile-menu replay share the revised four-panel
story. RAG gets a plain-language explanation before the guide introduces
practice and rewards. The gate scene follows that preparation. The Shardling
introduces the Interviewer and explains the mock system design interview before
the Interviewer speaks. The closing scene invites the player to choose a topic
on Play. A single "Go to Play" button saves completion and opens `/play`.

The browser checks now inspect all 11 dialogue beats in both themes at both
screen sizes, including speaker labels and the two-line phone limit. The replay
check confirms that the learning scene precedes the boss scene. All 13 welcome
browser checks passed, and selected desktop and phone screenshots were opened
for visual review. The production build and private-content scans passed.

`npm run check` also passed with 2,046 tests and the two existing opt-in skips.
The database-backed checks and browser fixtures ran outside the filesystem
sandbox because the sandbox blocks localhost sockets and PostgreSQL shared
memory.
