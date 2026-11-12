# RAG course fixes, round 2

Same rules as before: `beta` only, one commit per item, `npm run check` and `npm run build` after each, no em dashes in user-facing text, no env or secret changes, no production deploy, no live model runs. Test only with a test account, never Ruchi's account.

1. Slides can't be reread once the quiz starts. Players must be able to reread slides any time:
   - Quiz screen: add a "Slides" button in the top bar. It opens the topic's slides in an overlay at the slide the player last viewed. Closing it returns to the same question with the selected option still selected. Pause the visible-time timer while the overlay is open. No XP or star penalty.
   - Topic result screen (pass or fail): add a "Review slides" button.
   - Path: the node popover for any topic the player has started shows "Review slides".
   - The slides page itself must always show all slides, whatever the quiz state.
2. Replace Topic 1's 5 slides with the 13 slides in `docs/play-content/rag-course/topic-1-slides-v2.md`. Keep the wording as written. Questions stay the same.
3. Slide layout for longer slides: body text in Inter 16 px with comfortable line height, max width about 640 px, support bullet lists, numbered lists and bold. Slide titles stay in the pixel font, without trailing periods. Long slides scroll inside the slide frame; NEXT and BACK stay visible.
4. Diagrams: draw the ones described in the v2 file (S2, S6, S8, S9) as clean vector SVG, not pixel art: Inter labels 13 px or larger, 2 px lines, clear arrowheads, square corners, RAG violet plus gold for the one thing to notice, light and dark mode, alt text.
5. Tests: slides reachable during a quiz without losing the selected option; timer paused while slides are open; review links on the result screen and path; Topic 1 has 13 slides.

When done: push to `beta`, check the preview with the test account, and send screenshots of: the quiz with the Slides button, the slides overlay open mid-quiz, slides S2, S6, S8 and S9 with diagrams, and the result screen with "Review slides".
