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
