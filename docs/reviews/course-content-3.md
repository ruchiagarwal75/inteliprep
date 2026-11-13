# Course content 3

Topics 4 to 6 stay on beta. The separately approved Production release uses the
preceding reviewed commit, `c2b3104`. Course fixes 5 stays deferred. All course QA
uses isolated fixture accounts, static grading and stubbed providers. No live
model calls, secrets or environment changes are part of this update.

## 1. Authored content

The strict versioned compiler now accepts the supplied v1 headers as well as v2.
It compiles each unchanged source into 12 slides and 10 sequential questions,
with one correct choice, complete wrong-option feedback and bounded references.
Length-cue counts are 1/10 for each topic, with no warnings. Questions and answers
remain in server-only modules. The notebook projects slides and unanswered titles;
full questions and solutions appear only after the owner's submission.

The source contracts compare every authored field and slide paragraph. All 228
non-primer options, including the 120 new options, use the real static grader.
Existing saved snapshots and the original Topics 0 to 3 remain compatible.
