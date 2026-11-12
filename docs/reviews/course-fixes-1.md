# RAG course fixes, round 1

## 1. Question titles

All 21 questions use the supplied titles in drills, review lists and the
notebook. Older saved definitions and summaries receive titles on read without
rewriting their stored snapshots.

## 2. Retired rewards

Both player totals queries already sum the full XP ledger. Neither joins the
current catalog or filters out retired drills. The earlier explicitly requested
Play reset deleted the old ledger, badges and streak state. It caused the drop,
not the course catalog change.

A pre-reset browser snapshot verifies 277 XP, level 2 and a two-day streak.
Restoration added one compensating ledger entry of 277 XP with a unique reason
and reference. The account's 110 newer XP remain, for 387 XP and level 3.
Preserved streak events verify the two consecutive practice dates, so the
current and longest streak were restored to two. Existing badge records were
kept. The repair did not change attempts, saved results, existing ledger entries
or other accounts. It does not recreate deleted answer history.

SQL regression tests cover retired rewards, current rewards, repeated reads,
owner isolation, badge/streak preservation and an idempotent compensating entry.

## 3. First-attempt bonus clarification

The owner confirmed that the 25 XP bonus applies only when the topic's very
first attempt passes. A pass after any failed attempt receives no bonus. The
existing saved failed attempt must remain unchanged.

The reward rule is unchanged. The regression finishes a 3/7 attempt, then a
6/7 pass and verifies 70 XP with no bonus. A separate fresh account receives
95 XP for its first-attempt 6/7 pass, including the 25 XP bonus. Replays and
repeated submissions cannot add another bonus.

## 4. Course badge

Course passes award "First topic cleared" instead of reusing "First level
cleared". The account/badge primary key keeps the new badge once per account.
Tests cover an account that already owns the old badge, later topic passes and
replays. Saved course summaries no longer announce the retired level badge as
a new reward. Its stored record and original summary stay intact.

## 5. Instant slides

Slide navigation no longer waits for a network round trip. A per-lesson queue
saves visited slides in order, coalesces rapid navigation and retries from the
failed checkpoint. The last-slide quiz button still waits for all checkpoints
to reach the server. Reading can continue during an error. Arrow keys and Enter
work while saves are pending. Unit tests cover blocked and failed saves; a
browser regression holds the first request open while navigating several slides.

## QA account rule

Preview checks must use a separate QA account, never the owner's account.
Local browser and SQL checks use synthetic accounts in isolated fixtures.
The owner account repair above is a requested data restoration, not a test run.
