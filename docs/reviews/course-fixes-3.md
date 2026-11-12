# RAG course fixes, round 3

## 1. Short-window reader

The 1440 by 669 browser reproduction measured a 53 px slide body. The previous
viewport-height budget left too little space after the page and lesson headers.
The body was allowed to shrink. The Learn page now uses normal document flow;
the slide body grows with its contents and keeps a 280 px minimum. Navigation
sticks to the bottom of the viewport. No inner slide scrolling is required.

The browser regression checks all 13 slides at 1440 by 669, 1280 by 720,
1440 by 900 and 375 by 667. It checks visible text and the complete overlap
diagram, page scrolling, readable formatting and reachable controls.

QA uses isolated local accounts. The owner's attempts, rewards and history are
never changed, and no live model calls are made.

## 2. Overlay space

The overlay's nested viewport budgets and duplicate topic heading reduced its
reading area. The dialog now has a fixed header and footer around one scrolling
slide frame. The text uses its natural content height. The repeated Learn heading
is omitted. Controls never cover the diagram, and a new slide starts at the top.
The same four window sizes are checked with the complete table comparison
visible and no nested text scroller.

## 3. Slide-pause timing

The delayed-heartbeat browser reproduction changed the paused display from
00:03 to 00:07. A shared promise queue put the pause behind the pending response.
The server kept counting until that queued pause arrived; its response then
updated the paused display.

Visibility changes now cancel the old client request and send immediately.
An additive per-attempt order counter lets the server reject old heartbeats or
pauses that arrive late. This counter only orders requests; the server still
computes elapsed time. Older attempts and API requests remain readable.
Paused responses can reconcile the internal checkpoint without changing the
frozen display. Ticks resume only after closing the overlay.

The eight-second browser test holds a real local heartbeat response and checks
both the displayed value and saved answer time. SQL tests verify out-of-order
pause/resume requests, unchanged rewards and a rerunnable additive migration.

## 4. Pixel secondary buttons

Close and Back now share one scoped CSS module for their pixel font, clipped
corners, border, disabled state and keyboard focus. Disabled text keeps full
opacity. Button checks and overlay screenshots cover both themes. Learn-page
screenshots use the actual requested window heights, without full-page capture.

The activity-order migration was applied with existing attempt checksums
unchanged. Existing RLS policies and revoked browser-write privileges remain.
