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
