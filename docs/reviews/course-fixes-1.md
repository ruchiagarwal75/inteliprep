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

## QA account rule

Preview checks must use a separate QA account, never the owner's account.
Local browser and SQL checks use synthetic accounts in isolated fixtures.
The owner account repair above is a requested data restoration, not a test run.
