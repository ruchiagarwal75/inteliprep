# Course fixes 4

All work uses isolated local fixture accounts. No live model calls, secret or
environment changes, owner-account testing, or Production deployment.

## 1. Learn slide layout

The reproduction measured the Topic 1 frame at y=400.75, height 417.58, with a
280px body minimum. The stacked header and that minimum caused the empty floor.
The sticky controls had a solid top border and no overflow cue.

The header is one row. Slides use their content height. Each load and slide
change aligns the frame 12px below the viewport top. Short slides get document
scroll range outside the card, rather than blank space inside it. A 24px fade
appears only while content extends beneath the controls. The border is gone.

S6 and S9 use landscape SVGs on desktop and keep their portrait versions below
600px. Desktop diagrams are capped at 220px; those two are capped at 200px.

`course-fixes-4-learn.spec.ts` checks all 33 slides in Topics 0 through 3 at
1440×669 and 375×812, in both themes. It checks alignment, the fade, card spacing,
diagram height, keyboard navigation, and horizontal overflow. Screenshots are
under `artifacts/course-fixes-4/learn-T*-S*-{light,dark}-{1440,375}.png`.

## 2. Quiz options and Check bar

The reproduction found a 52px title. Option four ended at y=649.88 while Check
started at y=591.81. The inherited heading rule overrode the card's intended size.
A scoped card rule now fixes the title at 32px. The prompt and answer legend use
less vertical spacing. Option rows keep 16px horizontal padding and use 12px
vertical padding, with a tap target above 44px.

`course-fixes-4-quiz.spec.ts` visits every question in Topics 0 through 3 in both
themes and target sizes. When all options are one line, it requires all four to
sit above Check without scrolling. Screenshots: `quiz-{light,dark}-{1440,375}.png`.

## 3. Question-specific slide references

All 29 questions have one-based teaching references on the server. Topics 0 and
1 use the supplied mapping. Topic 2 links to vector similarity, bi-encoders,
representation size, ANN tuning, or embedding compatibility. Topic 3 links to
hybrid retrieval, rank fusion, rewriting, reranking, or freshness. Unknown older
question IDs fall back to slide 1. The public question includes only that slide
number, not an answer or teaching feedback.

Both the header's Slides button and a wrong answer's See slide N button open at
that reference. Reading saves its own cursor but reopening during the quiz starts
at the reference again. Selected choices and the paused drill clock are preserved.
The mapping unit tests cover every question. The browser reference test covers all
four topics in both themes and widths; the existing review and overlay tests check
choice retention, retry, timer pause, scrolling, focus and Escape. Screenshots:
`reference-T{0,1}-{light,dark}-{1440,375}.png`.

## 4. Center the current topic

The path previously scrolled only during the primer-unlock scene. Ordinary visits
now center the current topic's circle on load, including after font loading. The
motion is smooth by default and instant under reduced motion. A previously seen
unlock query also takes the ordinary centering path. Pending work is canceled on
unmount.

`course-fixes-4-path.spec.ts` checks the circle's center within 2px of the viewport
center in both themes, both sizes and both motion settings. Screenshots:
`path-{light,dark}-{1440,375}.png`.

## 5. World-unlock moment

The scene is a brief pixel-edged notice with the supplied nine-topic copy, a filled
Start Topic 1 link and a Later text action. The guide's message has a tail and no
button border. The connector uses the XP sprite gold, the Topic 1 node pulses
once, and the circle scrolls into view. Reduced motion uses no pulse, stroke
animation or smooth pan. The once-per-account cosmetic marker and server pass
check remain in place. This does not make unfinished topic content playable.

`course-fixes-4-unlock.spec.ts` checks both actions, refresh dismissal, gold color,
speech-bubble styling, a single pulse, centering, reduced motion and no horizontal
overflow in both themes and target sizes. The existing primer story still checks
the real quiz-to-unlock flow. Screenshots: `unlock-{light,dark}-{1440,375}.png`.

## 6. Topic 0 distractors and content warning

The authored primer and its private compiled JSON use every supplied distractor
and per-option explanation. Q7 now offers 1,012 and explains addition versus
multiplication; the 1,000 explanation remains. A frozen contract test verifies
that all prompts, correct answers, key ideas and why lines are unchanged. The
content tests also grade each new distractor through the static server grader.
Saved private question snapshots are not rewritten.

The compiler warns when the correct choice is uniquely longest in more than half
a topic's questions. Equal-length ties do not count. Topic 0 no longer triggers
it. Topics 1, 2 and 3 each trigger at 5 of 7; their content is outside this item's
requested edits and is left unchanged. Warning boundary and tie tests pass.
The full quiz browser matrix is rerun with the new options. Screenshots:
`quiz-{light,dark}-{1440,375}.png`.

## 7. Half-XP replay combos

Combo rewards now use the same server-derived replay flag as answer points,
including reviews of passed topics. A three-answer combo earns 2 XP on replay;
a five-answer combo earns 5 XP. New replay results show Replay: half XP. Cached
submissions, stored completed summaries and historical ledger rows are unchanged.

The actual Postgres replay test covers a normal pass, a 7-of-8 replay earning
44 XP, duplicate submissions, unchanged old ledger rows and passed-topic reviews.
The stars regression and summary-render tests also pass. The browser completes a
synthetic replay and checks its 2/5 XP combo messages, 44 XP total and result line.
Screenshots: `replay-{light,dark}-{1440,375}.png`.
