# Course fixes 5

Work stays on beta, using isolated fixture accounts and static/stubbed grading.
No live model calls, secrets, environment changes, Production releases or owner
progress changes are part of these fixes.

## 1. Learn focus shell

Learn now uses a viewport-height grid with a fixed header, scrollable card and
fixed footer. The site header and HUD are hidden on Learn routes. The top bar
keeps the exit, topic title, one segment per slide, unlocked quiz action and theme
toggle visible. Back and Next/Start quiz keep the same position. The card resets
its own scroll after navigation and shows a 24px fade only when more remains.
The old document auto-scroll hook and its spacer are removed. Escape returns to
the path; review dialogs retain their own close behavior. Ordered saves and the
server quiz gate are unchanged.

The current Topics 0 to 3 contain 48 slides, rather than the 33 named in the
request. The browser checks all 48 in both themes at 1440 x 669 and 375 x 812:
192 views. It confirms stable control geometry, a desktop card of at least 300px,
zero page scroll, reachable full text, correct fades and progress segments.
Fresh-reader gating, ordered navigation, restored XP and the review overlay also
pass. Five browser stories pass with no model calls.

The superseded auto-scroll browser contract is replaced by the focus-shell
contract. Existing quiz actions now select the footer action when the same
unlocked action is also present in the header.

Screenshots: `artifacts/course-fixes-5/learn-T{0,1}-S{1,2,6,9}-{theme}-{width}.png`.

Item 1 passes `npm run check` (1,996 tests), `npm run build` and both private-content
browser-chunk scans.

## 2. Unlock card placement

The card now takes space in the document, centered above the path. A fixed overlay
could still intersect captions even when moved to the horizontal center. The
flow layout prevents overlap at either width. It scrolls into view when shown;
Topic 1 pans into view after dismissal or the existing 6.5-second timeout.
The primary action, one-time account marker, gold connector, node pulse and
reduced-motion behavior remain.

All eight width/theme/motion browser cases pass. A geometry check compares the
card against every path node, caption and action, with no intersections.
Dismiss/reload and Start Topic 1 work. Item 2 passes check (1,996 tests), build
and both private-content scans. Screenshots: `unlock-{theme}-{width}.png` under
`artifacts/course-fixes-5/`.

## 3. First-load path centering

Initial centering now uses instant scrolling, including the font-ready and
node-animation alignment checks. The in-page move after dismissing the unlock
card still uses smooth scrolling, or an instant move under reduced motion.

The returning-player browser test checks centering within three seconds and
records native scroll requests to reject any initial smooth pan. Eight unlock
cases also pass, including a separate check for the permitted smooth move.
Item 3 passes check (1,996 tests), build and both private-content scans.
Screenshots: `path-{theme}-{width}.png` under `artifacts/course-fixes-5/`.

## 4. Wrong-answer spacing and missing-feedback audit

The empty-string paragraph was already conditional. The remaining spacing came
from the sticky, full-width Continue rule also matching See slide. That rule now
targets only the primary Continue button. See slide is a normal compact link.
Whitespace-only saved feedback is omitted in both the answer panel and notebook.
No saved payloads or authored answers are rewritten.

Missing wrong-option feedback across current Topics 1 to 3: **none**. All 81
incorrect options have feedback. The reported "Vector databases can't store them"
option belongs to older saved content and is absent from the current bank.

Five unit tests cover missing, empty and whitespace-only saved feedback, plain-text
rendering and the full content audit. Four isolated browser cases cover all three
empty variants at both themes and widths, checking the link's position and gap.
The cases use separate fixture accounts to respect real request quotas. Item 4
passes check (2,001 tests), build and both private-content scans.
Screenshots: `wrong-answer-{theme}-{width}.png` under `artifacts/course-fixes-5/`.

## 5. Diagram polish

The rollout gates use larger diamonds and two centered lines. Degradation labels
have separate space above the steps; longer labels wrap with an explicit line
height. Each shard has a separate offset replica box. The ingestion route enters
the bottom of Indexes, clear of generation and return lines in both layouts.
The remaining course diagrams keep their existing spacing defaults.

The new rendered-SVG check compares every text box with other text and sampled
shape borders, enforces eight-pixel clearance for step labels, and checks the
serving routes for crossings. All 16 diagram/theme/size states pass, with readable
Inter labels and the existing desktop height cap. Screenshots were inspected in
both layouts. Item 5 passes check (2,001 tests), build and private-content scans.

Screenshots under `artifacts/course-fixes-5/`:

- `T9-S11-{theme}-{width}.png`
- `T8-S9-{theme}-{width}.png`
- `T8-S5-{theme}-{width}.png`
- `T8-S2-{theme}-{width}.png`

## 6. Shared Play palette, requested during this task

Shared background, surface, text, border and accent tokens now alias the Play
palette in light and dark modes. Mock, results, admin, public pages and the hero
panel follow the same colors. Feedback states use the matching Play semantic
colors. The streak color uses Play gold so it remains readable on lavender.
Logo and mascot pigments stay intact. Whiteboard export remains white.

Palette contracts pass WCAG AA for text, controls, charts and feedback. The
selected browser run passes 25 course/theme stories. Three additional page-palette
stories pass after correcting a test's hex-format assumption: minification may
serialize white as #fff. The check now compares rendered colors. These stories
cover 13 routes at both widths and themes, including public/legal/sign-in, Play,
Mock, history, Brief, Progress and admin. Interview/results checks also verify
white image exports, theme persistence, blocked storage and no wrong-theme flash.

Item 6 passes check (2,001 tests), build and both private-content scans.
Screenshots are under `artifacts/course-fixes-5/palette/`, including:

- [Home light](../../artifacts/course-fixes-5/palette/public-_-light-1440.png)
- [Home dark phone](../../artifacts/course-fixes-5/palette/public-_-dark-375.png)
- [Brief light phone](../../artifacts/course-fixes-5/palette/invited-_interview_new-light-375.png)
- [Interview light](../../artifacts/course-fixes-5/palette/interview-light-1440.png)
- [Results dark](../../artifacts/course-fixes-5/palette/results-dark-1440.png)
- [Admin dark](../../artifacts/course-fixes-5/palette/admin-_admin-dark-1440.png)

## Files and scope

1. `course-slides.tsx`, new `course-learn-header.tsx` and `slide-overflow.ts`,
   slide frame/controls CSS, `play-frame.tsx`, `slide-keys.ts`, the replacement
   focus-shell browser contract and existing footer-action selectors.
2. `course-unlock.tsx`, its CSS, the path caption marker and overlap browser test.
3. Initial alignment in `course-unlock.tsx` and path/scroll-behavior browser tests.
4. `answer-sheet.tsx`, `lesson.module.css`, notebook rendering, saved-feedback
   unit tests and isolated browser fixtures.
5. Four diagram modules, shared box spacing, `svg-clearance.ts` and the rendered
   diagram browser contract.
6. `theme.css`, palette contracts, theme/page browser coverage, screenshot helpers
   and the styling notes in `CLAUDE.md` and `play-game-design.md`.

All six items pass their full check and production build. Final count: 2,001
unit/integration tests passed, with two existing skips. All 28 selected browser
stories pass across the final runs. The entire legacy browser suite is not
claimed green; its separate short-desktop quiz-layout issue remains outside this
work. Screenshots stay local and untracked. No live model calls, paid tests, data
migrations or owner-account QA. Course content, grading/reward rules and saved
history are preserved. Main and Production stay at `c2b3104`.
