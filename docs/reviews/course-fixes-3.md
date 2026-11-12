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
