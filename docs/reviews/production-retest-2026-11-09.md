# November 9 production retest

Work is on `beta`, with a separate commit and check/build for each numbered item.
Production is released only by fast-forwarding `main` after Preview verification.
Existing history, rubrics, workload numbers and scoring weights are preserved.
Whiteboard shrinkage and the rate-limiter clarification content are out of scope.

## 1. Release branch and Dependabot

Already fixed before this retest: local/GitHub `main` and `beta` and the Ready
Production deployment all matched `736e3dc`. It includes the nine beta-readiness
commits plus the three subsequently reviewed dependency updates. We did not reset
the branch to the older `bb65eff`.

The earlier apparent 26-commit gap was local: local `main` was at `f9df121`, and
its cached `origin/main` still pointed at `4a76800`. GitHub's actual `main` and
Production already matched `bb65eff`; the true local gap was 35 commits. Updating
GitHub refs through the connector did not automatically fetch or advance local
refs. The beta release deployments show `source=git` and `githubCommitRef=main`.
There is no evidence that those code releases bypassed `main`. The subsequent
dependency PRs were merged directly into `main` after fresh CI, with `beta`
synced afterward. That did bypass the desired Preview-before-main sequence,
although it did not deploy an older app. This retest restores the beta-first
release sequence.

Both Dependabot ecosystems now target `beta`. PRs 1, 3 and 5 were already merged
with fresh checks before this request. The three remaining open updates against
`main` (2, 4 and 6) are closed rather than merged. Dependabot reads its configuration
from the default branch, so new beta-targeted PRs follow the final main release.
The deployment guide now describes the actual public Production sign-in/invite
gate and protected Preview workflow.

## 2. Typed-interview copy

Changed these visible strings, preserving candidate quotes themselves:

- Home headline: “Mock system design interviews, out loud, with a whiteboard.”
  becomes “Mock system design interviews with a whiteboard and an AI interviewer.”
- Home description: “Talk it through, sketch your approach, and leave with
  something to build on.” becomes “Type your reasoning, sketch your design, and
  get feedback on your approach.”
- Pace status: “Explaining: the interviewer is listening” becomes “Explaining:
  the interviewer is reading your messages”.
- Initial explanation hint: “Explaining: send a message walking through your
  design before finishing.” becomes “Explaining: type a message describing your
  design before finishing.”
- Evidence label: “You said:” becomes “You wrote:”. The quoted evidence is unchanged.
- Feedback textbox: “Anything else you want to tell us? (optional)” becomes
  “Anything else you want to share? (optional)”.
- Waiting acknowledgement: “Go ahead with your explanation. I'll listen across
  as many messages as you need. Choose Done explaining when you're ready for
  questions.” becomes “Write your explanation across as many messages as you
  need. Choose Done explaining when you're ready for questions.”
- Quiet-turn acknowledgement: “I'm listening.” becomes “I'm reading your
  explanation.” Protocol fields named `listening` are retained for compatibility.

Shared interviewer instructions now explicitly describe typed messages.
References to voice/video as an excluded feature of the chat-service design
problem remain: those describe the exercise's scope, not an app input feature.
Rubrics, problem workloads and scoring weights are unchanged.

## Item 3: incident evidence and diagnostic limits

Vercel rejected the requested November 10, 03:37–03:40 UTC runtime-log query:
this project's Hobby plan retains runtime logs for one hour. The error-group query
returned no entries, which does not establish that no failures occurred. The CLI
request-log fallback was not authenticated. No deployment credentials were changed.
The exact causes of the reported chat and viewer 503 responses cannot be established
from these sources. Provider authentication, invite checks and Redis coordination
remain possibilities, not confirmed diagnoses.

The reporting database contained one browser-storage failure at 03:38:31 UTC for
interview `9a0fde28-8427-4950-bf88-95f7a214ec30`, request
`a7bf4eea-25c4-4b4d-9cda-7cdc1bf25c43`. It contained no provider failure for that
window. Reporting is best effort, so absence of a row is not proof of success.

For an incident within retention: open Vercel → ruchiagarwal75s-projects →
inteliprep → Logs, select Production, set the UTC window to 03:37–03:40 on
November 10, and filter Status Code 503. Inspect `/api/chat` and
`/api/monitoring/viewer` separately. Export the entries including request IDs,
`providerStatus`, `failureStage` and scrubbed code frames. For this expired window,
use an export captured at the time or a browser HAR containing response bodies and
`X-Request-Id`. Upgrading retention now does not recreate discarded runtime logs.

Future failures identify the failed boundary using an allowlisted `failureStage`.
Viewer failures now retain their actual cause for scrubbed logging instead of
silently dropping it. No error messages, answers, cookies or secrets are logged.

The e2e storage error was confirmed in a production build: on refresh,
CandidateWorkspace's pagehide handler deactivated the account scope before the
draft pagehide callback queued its final IndexedDB save. The rejected save carried
“Your signed-in account changed. Please reopen the interview.” Diagnostics showed
no schema validation failure. The immutable storage guard still rejects those
late writes, now with a typed cancellation that autosave does not misreport.
The synchronous draft journal still flushes before leaving. Quota, revision
conflicts and actual storage errors continue to report. The browser regression
asserts no storage reports through refresh, results and feedback persistence.
A separate browser check injects a chat 503, verifies the visible error and Retry
reply, and completes the retry without losing the candidate turn.

## 4. Active expiry and abandoned-session recovery

The active-expiry guard previously waited indefinitely when a draft was nonempty.
It now ends automatically once an in-flight reply settles. Per the owner's choice,
the draft stays saved and unsent; it never enters grading. Only server-verified
submitted answers can be scored. An explicit missing-transcript response archives
the browser copy without an exit or grading request, retains the draft/drawing/chat,
hides the live stage and timer, and offers a new interview. A single plain timeout
message replaces the checkpoint error/retry dead end. Other recoverable outages do
not trigger archival. Tests cover automatic expiry with a draft and reopening a
missing server session without a model request.

## 5. Plain scoring-rule copy

The header, end confirmation and unscored outcome use minutes, calculated from the
existing one-third threshold. The two-stage rule is described as explaining the
design in at least two parts of the interview, with walkthrough/discussion examples.
The end title no longer promises a scorecard. Internal AI-request language is removed.
Tests cover 15 minutes for a 45-minute attempt and 20 minutes for an hour.

## 6. Outcome before feedback

The result/scorecard, or its loading/error state, now precedes the optional feedback
card in the DOM and visual order. Short and insufficient-stage outcomes never
mount the cheering mascot. Feedback stays independent of grading and remains
available for short attempts. The browser test checks the outcome precedes the form.

Existing saved scorecards also receive the plain scoring-rule wording at render
time. Their stored content is retained unchanged.

## 7. Stable header geometry

Confirmed cause: the desktop header used an intrinsic `auto` center column, so
stage-name length changed both outer columns. It now reserves 220px for the stage
and fixed grid slots for the timer and controls. Browser geometry checks cover all
five labels at 1280px and 1440px. No whiteboard sizing or scaling was changed.

## 8. Brief defaults

The brief previously initialized every workspace to the first problem at Mid-level.
It now uses an account-scoped last-picked level, with the latest attempt as a legacy
fallback. The latest stored scorecard suggestion supplies the next problem; an
explicit Retry/Try link still wins. Without a scorecard, an ended attempt advances
to the next catalog entry. Durations still default to 45 minutes. Preference/storage
failures never prevent starting, and delayed reads cannot overwrite a user's choice.
No saved interview is changed or deleted. Unit and browser checks cover the defaults.

The Brief guide also replaces “The interviewer listens until you choose Done
explaining.” with “The interviewer waits while you type your explanation.”
This completes the item 2 copy sweep without changing the guide artwork.

## 9. Consecutive clarification asks

Confirmed the configured/raw clarification paths could append the pending
requirement even when it was the previous turn's final question. A shared final
reply check now removes an exact repeat before the existing clarification
continuation chooses a different ask. Facts are retained. It also protects
non-configured reply paths; drawing handoffs still have no filler question.
The regression sends two configured factual questions without answering the pending
one and requires different closing questions.

The repeat check also exposed a quadratic regex in `questionAtEnd`: a synthetic
32,000-character answer without a question took 14.2 seconds locally. Final-question
extraction now uses an end check and bounded backwards searches instead of regex
backtracking. A long-message regression protects this path.

CI exposed test-data coupling: new browser scenarios shared the original account's
three-start minute window. Each scenario now uses a separate synthetic account;
production limits are unchanged. The multi-request catalog integration test has
a 15-second cold-run budget instead of five seconds. No app/model timeout changed.
The local machine reported CPU_Speed_Limit 22%, so subsequent full check/build
validation uses the existing GitHub Actions job, with targeted and real-model
checks locally. Each item's CI must pass before moving on; Production stays on main.

<!-- retest-live-9 -->

## Live reply comparison: item 9

### 9-repeated-clarification

Before:

> There’s no fixed memory target. Assume 100,000 active API keys, each with a limit of 100 admitted requests per rolling 60 seconds. Estimate memory based on the state your design needs to retain.
>
> What should callers see when the quota is exceeded or the limiter is unavailable?

After:

> There’s no fixed memory budget specified. Estimate it from 100,000 active keys, the limit of 100 admitted requests per rolling 60 seconds, and the state representation you choose. Include any storage overhead in your assumptions.
>
> Anything else you'd like to clarify before drawing?

<!-- end-retest-live-9 -->

## 10. Resource estimates and arithmetic follow-ups

Confirmed two causes: the capacity detector omitted memory and common resource
phrases, and declarative estimates never selected the estimation continuation.
Senior/Staff capacity questions now cover memory/RAM, disk/storage, bandwidth, cache
size and machine/server counts. A volunteered numerical estimate gets a units-and-
assumptions follow-up instead of being dropped. The interviewer is told to request
a redo for a clearly incorrect estimate without supplying the correction or a
conversion hint. Mid-level behavior and configured workload inputs are unchanged.

<!-- retest-live-10 -->

## Live reply comparison: item 10

### 10-memory-question

Before:

> There’s no fixed memory target. Estimate it using 100,000 active keys and the 100-request rolling-window limit, with your own assumptions about how much state each key needs.
>
> What should callers see when the quota is exceeded or the limiter is unavailable?

After:

> There’s no fixed memory target. Assume 100,000 active API keys, with up to 100 admitted requests per key in any rolling 60 seconds. Peak traffic is 10,000 checks per second, and rejected requests don’t consume quota.
>
> What capacity do you estimate from those inputs, and what state or resources does your design need?

### 10-wrong-estimate

Before:

> That estimate looks high for 10 million creates per day.
>
> Anything else you'd like to clarify before drawing?

After:

> That estimate looks high for 10 million creates per day.
>
> Could you walk through that estimate again, showing the units at each step?

### 10-volunteered-estimate

Before:

> Noted. We can revisit the state estimate during the design discussion.
>
> Anything else you'd like to clarify before drawing?

After:

> That estimate assumes one 64-byte entry per key, before Redis overhead.
>
> Could you walk through that estimate again, showing the units at each step?

<!-- end-retest-live-10 -->

## 11. Standalone requirement questions

The URL-shortener's configured goal question contained “for the discussed traffic”
regardless of prior messages. Rendering now uses “for this service”. Answer detection
recognizes both the old and new forms, so earlier saved conversations stay compatible.
The regression begins with a sign-in question and no traffic discussion.

<!-- retest-live-11 -->

## Live reply comparison: item 11

### 11-sign-in-first

Before:

> No, short links are public and visitors don't need to sign in.
>
> What redirect latency and availability goals would you target for the discussed traffic?

After:

> No, links are public and visitors don't need to sign in.
>
> What redirect latency and availability goals would you target for this service?

<!-- end-retest-live-11 -->

## 12. Explain only a drawing update

Confirmed cause: `hasExplanation` sliced the transcript at the latest Explain
control, discarding earlier walkthroughs when deciding readiness. It now recognizes
a real explanation in any earlier explanation window. The first walkthrough is
still required; controls and clarification messages do not satisfy it. A return
cycle asks only what changed and enables Done immediately without another answer.
The interviewer remains quiet. Existing transcript contents are retained.

<!-- retest-live-12 -->

## Live reply comparison: item 12

### 12-explain-update

Before:

> Write your explanation across as many messages as you need. Choose Done explaining when you're ready for questions.

After:

> Your earlier explanation is saved. Describe just what changed, or choose Done explaining to continue.

<!-- end-retest-live-12 -->

The item 12 pace-control reply is deterministic. Its before/after comparison tests
the actual reply path without an unnecessary model call; the browser test covers
the full return-to-drawing sequence.
