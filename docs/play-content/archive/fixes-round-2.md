# Play beta fixes, round 2 (from testing the beta preview on Nov 11, evening)

Same rules as before: `beta` only, one commit per item, `npm run check` and `npm run build` after each, no em dashes in user-facing text, no env or secret changes, no production deploy, no repeated live model runs (mocks in tests).

What passed on the preview: AI grading now works (a strong probe was graded Correct, a weak trade-off answer was graded Not quite), keyboard play (1 to 4, Enter, Enter), round dots, first-try bonus (4 of 5 gave 65 points = 40 + 25), daily goal ring filled, Level 2 unlocked.

1. AI-graded drills take about 4.9 s on the preview (`POST /api/play/submit`). While grading, show a clear "Checking your answer..." state on the button and disable it. Then try a faster model setting for drill grading only (Mock keeps its current model). Keep the strict rubric. Report before and after times from the preview.
2. Math drills use messy numbers: "11,102,714 documents". Interview math uses round numbers. Use the steps in rag-levels-1-2.md (docs in steps of 1M, questions in steps of 10K, and so on) so every generated value is round.
3. The streak flame renders dark brown. Make it a warm orange that passes contrast in light and dark themes.
4. The new badge shows as a notification with a "Dismiss" button. Make it feel like a reward: a badge icon, the badge name large, one line on what it means, no Dismiss button.
5. Remove the "Levels cleared: 1" line on the level complete screen. It repeats the path.
6. Starting a round still takes 0.6 to 1.4 s (`/api/play/round`). Find where the time goes (database round trips, cold starts) and report it. Fix only if it's a small change.

When done: push to `beta`, check the preview, and send me the timings for items 1 and 6 plus screenshots of items 3 and 4.
