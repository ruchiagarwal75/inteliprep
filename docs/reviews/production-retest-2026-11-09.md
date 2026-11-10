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
