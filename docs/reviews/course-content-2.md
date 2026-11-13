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

## 2. Topic size, passing and path labels

The course accepts six through ten answers, retaining the 75% rounded-up rule.
Ten-question topics need eight correct. The existing star bands, 45-second star
time threshold, answer XP, combo rewards and first-attempt bonus are unchanged.
Topics 1, 2 and 3 show About 15 min; the primer remains About 8 min.

Rule tests cover each supported question count and ten-question star outcomes.
Actual Postgres tests complete both revised topics with 8/10 and 9/10. They check
unchanged answer and combo awards, and verify that a 7/10 attempt cannot revoke an
older pass, three stars, its pass date or historical points. No data migration is
needed.

## 3. Nine responsive vector diagrams

Topic 2 adds vectors/angle, bi-encoder lanes, HNSW layers, IVF clusters and filter
placement. Topic 3 adds hybrid merge, the revised three-column RRF example,
multi-query fan-out and a retrieval funnel. Each has a landscape layout capped at
200px on desktop and a separate portrait layout below 600px. Native Inter labels,
2px lines, square boxes, theme tokens and gold highlights match the existing course
illustrations. Every SVG has a title and its figure has a descriptive alternative.
The unused two-tower, ANN and RRF illustrations and their registry entries are removed.

The diagram browser test visits every Topic 2 and 3 slide at both target sizes and
in both themes. It checks overflow, desktop height, portrait orientation, Inter
labels of at least 13px, unclipped text, 3/6/12 HNSW nodes, two of six IVF clusters
scanned and the exact RRF lists. The existing slide/notebook diagram regression
also passes. Screenshots of all nine diagrams in both themes and sizes are in
`artifacts/course-content-2/T{2,3}-S*-{light,dark}-{1440,375}.png`.

## 4. Content and end-to-end contracts

The additional source contract compares every question field and every revised
slide paragraph with the supplied Markdown. All 108 options across the 27 revised
questions go through the actual static server grader with shuffled positions.
Checks include correctness, expected answer, Key idea, Why, specific If wrong
feedback and the absence of private fields before submission. The model grader is
stubbed to throw if called.

A separate synthetic browser account reads and passes Topics 2 and 3 at 8/10.
Each run deliberately gets the first question wrong, opens See slide on the
matching reference and returns to finish the quiz. Result screenshots cover both
themes and target widths. The slide account, quiz account and earlier regression
accounts are isolated from one another and from the owner's account.

The production browser fixture now verifies the compiled course before its build,
matching the normal prebuild contract. Both production builds retain the private
question-content browser-chunk scan. Screenshots stay on disk outside Git.

## Files by item

1. Compiler and definitions: `scripts/build-rag-course.mjs`,
   `src/lib/play/course/{parse,parse-v2}.mjs`, `definition.ts`, `rag.json`,
   `question-slides.ts`, `src/lib/play/round-refresh.ts`, content and compatibility
   tests, `package.json`, and the three unchanged authored source files.
2. Passing and labels: `src/lib/play/course/{rules,metadata}.ts`,
   `src/components/play/course-path.tsx`, rule/metadata tests and the ten-question
   Postgres test.
3. Diagrams: `src/components/play/course-diagram*.tsx`, the diagram CSS Module,
   `src/lib/play/course/slide-diagrams.ts`, compiler mapping and JSON, diagram
   tests and isolated browser fixtures.
4. Contracts: `src/lib/play/course/versioned-options.test.ts`,
   `tests/e2e/course-content-2-pass.spec.ts`, the browser fixture and server script,
   and this report.

No database migration is needed. `course-fixes-5.md` and `learn-mode.md` remain
untouched and outside these commits.

## Verification results

- `npm run check` and `npm run build` pass for all four items.
- Final unit/integration run: 1,901 passed, two existing skips.
- `npm run test:e2e -- 'course-|primer'`: 28 passed in 7.7 minutes.
- All 108 revised options use the static grader. No model calls were made.
- The 25 revised slides were checked in both themes at 1440 x 669 and 375 x 812.
- All nine diagrams satisfy the desktop height, portrait, font and overflow checks.
- Topic 2 and Topic 3 each complete at 8/10 with the correct wrong-answer slide.
- Source-file SHA-256 checks confirm all supplied wording remains unchanged.
- Both private-content production chunk scans pass.

Screenshot overviews, each containing all nine diagrams:

- [Light desktop](../../artifacts/course-content-2/contact-light-1440.jpg)
- [Dark desktop](../../artifacts/course-content-2/contact-dark-1440.jpg)
- [Light narrow](../../artifacts/course-content-2/contact-light-375.jpg)
- [Dark narrow](../../artifacts/course-content-2/contact-dark-375.jpg)

Individual PNGs use `T2-S2`, `T2-S3`, `T2-S8`, `T2-S9`, `T2-S11`,
`T3-S4`, `T3-S5`, `T3-S7` and `T3-S9`, followed by the theme and width.
Passed-topic PNGs use `T{2,3}-passed-{light,dark}-{1440,375}.png`.
