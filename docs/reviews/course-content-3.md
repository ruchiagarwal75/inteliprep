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

## 2. Path and rewards

Topics 4 to 6 are open content, with sequential prerequisites and About 15 min
labels. Topics 7 to 9 stay Soon. The path copy now names Topics 0 to 6.
The existing ten-topic and thirty-star totals include these topics automatically.
No pass, star, XP, combo, first-attempt bonus or review rule changed.

The isolated Postgres test passes each new quiz at 8/10, checks the next unlock,
records two review items per quiz and confirms the existing first-attempt bonus.
It reads the Topic 6 chest from a new snapshot and retries opening it, proving one
ledger award. Unanswered notebook entries expose no question or grading fields.
Item 2 passes all 1,961 tests and the production build, including both private
browser-chunk scans. No data migration or user progress reset is needed.

## 3. Twelve vector diagrams

Added the four authored illustrations per topic. Each uses native Inter labels,
2px lines, square boxes, existing violet/gold theme tokens, a landscape layout
and a separate portrait layout below 600px. Both SVGs have titles and the figure
has a descriptive alternative. The two curves are drawn SVG paths, with no chart
library. Existing teaching illustrations remain unchanged.

The diagram browser test visits all 36 slides in both themes at 1440 x 669 and
375 x 812: 144 views. All 48 diagram states fit, have labels of at least 13px,
keep text inside the SVG, and stay at or below 200px tall on desktop. It records
no page errors, overflow or model calls. The phone timeline keeps its short
retrieval and re-ranking labels on one line; the attention curve label stays
clear of the curve. Final Item 3 checks pass: 1,974 tests, the production build,
both private browser-chunk scans and the real-browser diagram test.
