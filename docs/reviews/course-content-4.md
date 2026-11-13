# Course content 4

This update completes the RAG course on beta. Course fixes 5 stays deferred.
All checks use synthetic fixture accounts, static grading and stubbed providers.
No live model calls, environment changes, Production deployment or owner progress
changes are part of this work.

## 1. Compile the authored content

The strict compiler now includes Topics 7, 8 and 9. Each supplied Markdown file
stays unchanged and produces 12 slides and 10 questions with complete feedback.
Length-cue counts are 0/10, 1/10 and 2/10 respectively, with no warnings.
Question banks and solutions stay out of browser bundles. The API releases the
current question, then the owner's feedback after submission.
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

## 3. Twelve responsive vector diagrams

Added the four requested diagrams for each new topic. The components reuse the
existing responsive SVG frame, Inter labels, 2px lines, square boxes and theme
tokens. Desktop art is capped at 200px; phones use portrait layouts below 600px.
Every figure has descriptive alternative text and both SVG layouts have titles.
Gold marks the teaching focus. Regression failures, failure crosses and rollback
arrows use the existing wrong red. A contract ensures green remains exclusive to
the two existing Topic 6 citation and faithfulness diagrams.

The browser caught a clipped staircase label. Screenshot review also found lines
crossing the online label and shard replica captions. The label and routes were
moved clear, without changing authored slide text or the diagram style.

Item 3 passes `npm run check` (1,996 tests) and `npm run build`, including both
private browser-chunk scans. Responsive browser results are recorded in Item 4.

## 4. Contracts and browser walkthrough

The browser slide check visits every new slide in both themes at 1440 x 669 and
375 x 812: 144 views, including 48 diagram states. It checks Inter text at least
13px tall, text inside each SVG, descriptive alternatives, desktop height and
horizontal overflow. The contact-sheet script now accepts a content4 set while
preserving its existing content3 default.

A fresh synthetic account completes Topics 0 to 9 in order. Every ten-question
topic passes at 8/10; the primer and Topic 1 keep their own rules and finish at
7/8 and 6/7. Each topic's first wrong answer opens See slide N at the server's
reference. Chests after Topics 3, 6 and 9 stay open after refresh and retry with
no second award. The path shows 10 of 10 cleared and the thirty-star denominator.
The all-perfect progress contract also renders 30 / 30 stars. The notebook then
shows all thirty new submitted questions with the owner's feedback.

The CI timeout is 35 minutes to accommodate the new ten-topic browser story
alongside existing stories. No tests, application rate limits or reward rules
were relaxed. The older short-desktop quiz-layout issue is still outside this
content task; the entire legacy browser suite is not claimed green.

## Files by item

1. `scripts/build-rag-course.mjs`, `rag.json`, the three source Markdown files,
   and versioned-content, option-grading, projection and slide-reference contracts.
2. `src/lib/play/course/metadata.ts`, `src/components/play/course-world.tsx`,
   `tests/play-course-content-4.test.ts` and current path/notebook expectations.
3. Six new `course-diagram-*` component modules, their operations registry,
   shared diagram parts/CSS, the diagram enum/compiler mapping and SVG contracts.
4. `tests/e2e/course-content-4-{diagrams,pass}.spec.ts`, synthetic fixture setup,
   the complete-progress rendering assertion, contact-sheet script, CI timeout
   and this report.

## Contact sheets

All twelve new diagrams appear in each sheet:

- [Light desktop](../../artifacts/course-content-4/contact-light-1440.jpg)
- [Dark desktop](../../artifacts/course-content-4/contact-dark-1440.jpg)
- [Light phone](../../artifacts/course-content-4/contact-light-375.jpg)
- [Dark phone](../../artifacts/course-content-4/contact-dark-375.jpg)

Individual images use `T7-S1`, `T7-S4`, `T7-S6`, `T7-S7`, `T8-S2`, `T8-S3`,
`T8-S5`, `T8-S9`, `T9-S1`, `T9-S3`, `T9-S4` and `T9-S11`, followed by theme,
width and `-diagram.png`. Result images are `T{7,8,9}-passed.png`; chest images are
`topic-{3,6,9}-chest.png`. `all-topics-cleared.png` shows the completed path.
Screenshots remain on disk and are not tracked in Git.

## Scope

The supplied Topic 7 to 9 source hashes match their starting bytes. Existing
progress, interview history, scoring, whiteboard and interview behavior are
unchanged. No database migration is needed. Course fixes 5 and Learn mode stay
deferred. Main and Production remain at `c2b3104`; this update is beta only.

## Final verification

- All four items pass `npm run check` and `npm run build`.
- Final unit/integration result: 1,996 passed, two existing skips.
- All 120 new options, and all 228 earlier non-primer options, pass the static
  grader contracts with shuffled choices and specific wrong-option feedback.
- Both private-content production browser-chunk scans pass.
- The new diagram browser test passes all 144 slide views and 48 diagram states
  with no page errors, clipped text, horizontal overflow or model calls.
- The fresh ten-topic browser story passes, including slide recovery after
  mistakes, sequential access, all three persistent/idempotent chests and the
  final completed path. It records no page errors or model calls.
- The supplied Markdown files match their original SHA-256 hashes.
- All twelve diagrams were reviewed in all four generated contact sheets.
- No live model calls, paid tests, account resets or database migrations.

Reproduce the browser checks with:

```sh
npm run test:e2e -- tests/e2e/course-content-4-diagrams.spec.ts tests/e2e/course-content-4-pass.spec.ts
node scripts/build-course-contact-sheet.mjs artifacts/course-content-4 content4
```
