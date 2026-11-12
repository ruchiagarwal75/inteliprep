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
