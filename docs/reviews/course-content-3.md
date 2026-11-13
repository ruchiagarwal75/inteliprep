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

## 4. Contracts and browser walkthrough

The fresh synthetic account passes Topics 0 to 6 in order. Topics 2 to 6 finish
at 8/10. The primer and Topic 1 retain their authored eight- and seven-question
sizes, finishing at 7/8 and 6/7. Every first wrong answer opens See slide N at the
server-provided reference. The Topic 6 chest stays open after refresh and a retry
does not award more points. The notebook then shows the owner's submitted answers.
The walkthrough records no page errors or model calls.

Updated old browser expectations for three remaining Soon nodes, 58 unanswered
notebook entries after Topic 1, ten-question rounds and the current replay reward.
The replay check expects 46 XP: five concepts at 5, two math answers at 7, and
combo awards of 2 and 5. Its obsolete 54 XP expectation did not match existing
rules. The clock-recovery story checks that Continue works instead of requiring
an obsolete button color. No app reward or timer code changed.

Contact-sheet review caught a curve label crossing the recall line on phones.
The label is moved clear of the curve. A browser check now samples both drawn
curves in screen coordinates and rejects any path crossing its label.

The CI job timeout is 25 minutes instead of 15 to accommodate the additional
seven-topic browser story. It does not skip checks or relax application limits.
`scripts/build-course-contact-sheet.mjs` reproduces all four contact sheets from
the captured diagram PNGs. Screenshots remain local and untracked.

## Files by item

1. `scripts/build-rag-course.mjs`, `src/lib/play/course/parse-v2.mjs`, `rag.json`,
   the three authored source files, and content/title/reference/projection tests.
2. `src/lib/play/course/metadata.ts`, `src/components/play/course-world.tsx`,
   metadata contracts and `tests/play-course-content-3.test.ts`.
3. Six new `course-diagram-*` components, the answer-diagram registry, shared
   diagram CSS and mapping, compiler mappings, structural tests and the diagram
   browser fixture.
4. `tests/e2e/course-content-3-pass.spec.ts`, fixture accounts, updated browser
   helpers/expectations, curve-label collision checks, the contact-sheet script,
   `.github/workflows/check.yml` and this report.

## Screenshot contact sheets

Each sheet contains all twelve diagrams:

- [Light desktop](../../artifacts/course-content-3/contact-light-1440.jpg)
- [Dark desktop](../../artifacts/course-content-3/contact-dark-1440.jpg)
- [Light phone](../../artifacts/course-content-3/contact-light-375.jpg)
- [Dark phone](../../artifacts/course-content-3/contact-dark-375.jpg)

Individual diagrams use `T4-S2`, `T4-S3`, `T4-S6`, `T4-S8`, `T5-S1`, `T5-S3`,
`T5-S9`, `T5-S10`, `T6-S2`, `T6-S5`, `T6-S6` and `T6-S8`, followed by theme,
width and `-diagram.png`. Topic result images are `T{4,5,6}-passed.png`;
`topic-6-chest.png` shows the opened chest after reload.

## Scope and remaining work

The three supplied Markdown files stay byte-for-byte unchanged. Course fixes 5
and Learn mode remain deferred. The interview engine, problems, grading weights,
whiteboard and all existing progress/history remain unchanged. No course migration
is needed and no account progress was reset.

The separately requested Production release is main commit `c2b3104`, deployed
through the Git integration to `shardling.com`. Home and Sign in passed eight
signed-out browser states across themes and widths; health returns 200 and
signed-out protected APIs return 401. The pending nullable feedback input-preference
migration was applied before that release. No environment variables changed.
Topics 4 to 6 are excluded from main and Production.

The earlier full CI run on `c2b3104` failed four Play browser stories despite
passing audit, unit checks and build. This update corrects stale course counts,
round length, theme and replay assertions in three of those stories. The older
short-desktop quiz-layout check is outside this content task and is not claimed
as fixed. The full legacy browser suite is not claimed green.

## Final verification

- `npm run check` and `npm run build` pass for each of the four items.
- Final unit/integration count: 1,974 passed, two existing skips.
- All 120 new options, plus the 108 earlier non-primer options, pass the real
  static grader contracts with shuffled positions and specific feedback.
- New browser checks pass: all 144 slide views and the fresh seven-topic story.
- Five existing Play browser stories pass across the targeted runs, including
  replay, chest idempotency, network retry, clock recovery and notebook isolation.
- The final rerun passes all three selected diagram/game checks.
- Both private-content production browser-chunk scans pass.
- Zero live model calls or paid tests. All QA accounts and answers are synthetic.
