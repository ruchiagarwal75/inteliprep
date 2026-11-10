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
