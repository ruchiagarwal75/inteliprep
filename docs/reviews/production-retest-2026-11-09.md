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
