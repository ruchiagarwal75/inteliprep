# Course content 4

This update completes the RAG course on beta. Course fixes 5 stays deferred.
All checks use synthetic fixture accounts, static grading and stubbed providers.
No live model calls, environment changes, Production deployment or owner progress
changes are part of this work.

## 1. Compile the authored content

The strict compiler now includes Topics 7, 8 and 9. Each supplied Markdown file
stays unchanged and produces 12 slides and 10 questions with complete feedback.
Length-cue counts are 0/10, 1/10 and 2/10 respectively, with no warnings.
Questions, solutions and wrong-option feedback stay server-only until submitted.
The notebook can project all ten topics while withholding unanswered solutions.

Source contracts verify every question field, option, slide paragraph and slide
reference. All 348 non-primer options, including the 120 new choices, pass through
the real static server grader with shuffled option positions. Item 1 passes
`npm run check` (1,980 tests) and `npm run build`, including both private-content
browser-chunk scans.

## 2. Open the complete path

Topics 7 to 9 now have sequential unlocks and About 15 min labels. The path says
"All 10 RAG topics are open in this beta." No RAG topic remains Soon.
The existing ten-topic and thirty-star totals need no rule change.

The isolated Postgres test passes each new topic at 8/10, checks access isolation,
records two review items per quiz and retains the first-attempt bonus. The final
chest stays open in a new snapshot; retrying it creates one ledger award. Every
notebook topic has slides, and unanswered entries expose no solution fields.
Existing browser expectations now reflect all ten topics and their notebook
counts. No rewards, pass rules, saved progress or database schema changed.
Item 2 passes `npm run check` (1,982 tests) and `npm run build`, including both
private browser-chunk scans.
