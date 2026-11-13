# Course content 2

Work stays on beta. QA uses isolated local fixture accounts, static grading and
stubbed providers. No live model calls, owner-account testing, secrets, environment
changes, Production deployment or main changes. Course fixes 5 stays deferred.

## 1. Compile the authored replacements

The strict versioned compiler reads the three supplied files. It requires ordered
question IDs, one Slide reference, four distinct options with one correct mark,
Key idea, Why and feedback for each wrong option. It rejects missing, duplicate,
unknown and out-of-range fields. Build verification fails on invalid source or a
compiled JSON artifact that differs from the source. Original wording stays intact.

The course schema can hold Q10 and ten questions. Topic 1 keeps its 13 slides and
has seven revised questions. Topic 2 has 13 slides and ten questions; Topic 3 has
12 slides and ten questions. Existing Q1 through Q7 IDs are retained. Slide links
come from the supplied references; the primer mapping remains unchanged.

Idle course rounds renew their clocks without replacing saved question snapshots
or options. New reviews look up the current version by the same question ID. The
compatibility test seeds a legacy seven-question round and verifies its snapshots,
answers, points and earned stars survive, while a due review uses the new content.

Content and compiler tests cover all three files and invalid source/artifact cases.
The length-cue counts are exactly 1/7, 0/10 and 2/10, with no warnings. Questions
and grading content stay in server-only modules; the public slide projection and
per-question API projection keep their existing boundaries.
