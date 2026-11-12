# RAG course fixes, round 3 (tested on the beta preview, Nov 12, about 2:30 PM PT)

Same rules as before: `beta` only, one commit per item, `npm run check` and `npm run build` after each, no em dashes in user-facing text, no env or secret changes, no production deploy, no live model runs. Test with test accounts only.

What passed: XP restored in the HUD (414 XP, LV 3), real question titles ("Big chunks"), the Slides button mid-quiz opens at the last viewed slide and keeps the selected option, 13 Topic 1 slides, the 4 vector diagrams render (pipeline, overlap, table header, small-to-big) and read clearly.

1. BLOCKER: slide text is invisible on normal laptop windows. In a 1440 x 669 browser window (Ruchi's real Chrome window), the Topic 1 Learn page shows only the slide counter and title. The slide body collapses to 0 px: `.course_lesson` is locked to the viewport height (397 px here, min 340 px), the frame gets 117 px, and the body (`flex: 0 1 auto; min-height: 0`) shrinks to nothing. Slide 1's text is in the DOM but not visible.
   - Don't lock the lesson to the viewport height. Let the page scroll normally.
   - Give the slide body room: `flex: 1 1 auto` and a min height of about 280 px.
   - Keep BACK and NEXT reachable: make the nav bar sticky at the bottom of the viewport.
   - Test at 1440 x 669, 1280 x 720, 1440 x 900 and 375 x 667, and add a browser test at 1440 x 669 that asserts the slide body text and diagram are visible without inner scrolling.
2. Same problem in the mid-quiz Slides overlay: the slide area shows about 120 px, so diagrams are cut in half and the text sits in a tiny inner scroll box. Use the full overlay height for the slide. Inside the overlay, drop the repeated "TOPIC 1 · LEARN / INGESTION AND CHUNKING" heading (the overlay title already says "Topic 1 slides").
3. The timer keeps running while the Slides overlay is open. With the overlay open for about 8 s, the drill timer went from 00:33 to 00:40, even though it says "Paused for slides". Freeze both the displayed time and the counted time while the overlay is open, and resume on close. Add a test that reads the timer before and after an 8 s overlay.
4. Style the overlay's "Close" button and the slide BACK button like the other pixel secondary buttons (they look different from NEXT and from each other).

When done: push to `beta`, check the preview with a test account at 1440 x 669, and send screenshots of: Topic 1 slide 1 and slide 6 on the Learn page, the overlay showing slide 8 with its full diagram, and the timer before and after the overlay.
