# Play beta fixes, round 1 (from testing the beta preview on Nov 11)

Same rules as the Play prompt: work on `beta`, one commit per item, `npm run check` and `npm run build` after each, no em dashes in user-facing text, don't touch secrets or env vars, don't deploy production, don't fast-forward `main`. Don't run repeated live model tests. Exception: for item 1 only, you may run up to 3 real grading calls on the beta preview to confirm the fix.

## P0: blocker

1. AI-graded drills fail on the beta preview. Submitting a Trade-off call answer (RAG Level 1, "Choose a chunk size") returns `POST /api/play/submit` 503 and shows "Practice is unavailable right now. Your saved answers are safe. Please retry." Retry gives 503 every time. Multiple-choice and math drills on the same preview return 200 and work.
   - Find the cause (Vercel logs for the preview, the written grader, the daily AI usage check, model config).
   - If it needs an env var or setting in Vercel's Preview environment, don't change it. Tell me exactly which variable and value to add.
   - Log the real error server-side (no answer text, no secrets) so this is diagnosable next time.

## P1: fix before inviting testers

2. Sign-in card still says "Your interview history stays in this browser, separately for each account." That is no longer true. Replace with: "Your progress is saved to your account."
3. Internal notes are visible to users: Play home ("RAG Levels 1 and 2 have reviewed drills. Levels 3 and 4 use clearly marked samples.") and the RAG page ("Levels 1 and 2 use real drills. Levels 3 and 4 are beta samples marked [sample]."). Remove both. Keep "[sample]" only inside sample drill text.
4. Wrong-answer screen says "Try this again" but there is no retry, only Continue. Change the heading to "Not quite". Don't show "+0 points" in the success color; hide the points line on a wrong answer. Add one line: "This one comes back for review in 2 days."
5. Locked levels show a "Locked" chip and a disabled "Start level" button. Replace the button with a lock and the text "Pass Level N to unlock".
6. A resumed round shows the time since the attempt was first opened (drill 1 showed 16:53 on arrival). Show "Resumed" next to the timer when the attempt was opened in an earlier visit.
7. Mock page: the "Saved mock interviews" link sits directly on top of the "AI / ML system design" heading. Add normal spacing.
8. Speed: opening a round fires `/api/play/round` twice plus `/api/play/profile`, about 1.2 to 1.5 s before the first drill shows. Remove the duplicate call and aim for under 500 ms from click to first drill on the preview. Report before and after times.

## P2: make it feel like a game (the main goal of this round)

Today it works but reads like a quiz form. Make it feel like a game, still calm and professional (users are working engineers), and respect reduced motion everywhere.

9. Level path on the topic page: the 4 levels as connected nodes on a path. Passed = filled with a check, current = highlighted, locked = muted with a lock. Placement stays as a small "Skip ahead" link above the path.
10. Round header: 5 dots, one per drill, that fill green or gray as each answer is graded, so progress inside a round is visible at a glance.
11. Answer feedback: on a correct answer, show the points earned large in the result card and animate them into the nav points counter. Show the streak as a small flame icon with the number in the nav.
12. Level complete screen (new): score (for example 4 of 5), points earned this round, any new badge revealed, and a big "Start Level N+1" button. Light confetti on pass (none with reduced motion). On a fail: score, which drills to review, and "Try again".
13. Daily goal: a small ring in the nav that fills when the user finishes 1 round that day. Tooltip: "Daily goal: 1 round".
14. Keyboard play: 1 to 4 picks a multiple-choice option, Enter submits, Enter again continues. Show the hints subtly under the options.

## When you're done

Push to `beta` and check the preview. Send me:
- the cause and fix for item 1 (or the exact Vercel setting I need to add)
- before and after timings for item 8
- screenshots: topic page level path, a round header with dots, a correct answer result, the level complete screen (pass and fail), the nav with streak flame and daily goal ring
- anything you skipped and why
