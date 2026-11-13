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
