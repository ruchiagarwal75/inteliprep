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

Hosted migration has not been applied yet. Tests use isolated fixture accounts.

Item 1 passed the full check with 2,038 tests and the production build, including
private-content scans. Server tests cover cross-request suppression, replay,
concurrent/retried dismissal, owner isolation and denied browser writes.

## 2. Pixel story

The four scenes use the final copy and the supplied character assets unchanged.
Each quoted line gets its own dialogue beat so it fits a phone text box. Panel 2
starts with the Interviewer speaking, followed by the Shardling's two lines.
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

The two welcome migrations are not yet applied to the hosted database.
