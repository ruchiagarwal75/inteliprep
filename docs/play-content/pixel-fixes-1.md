# Pixel Play fixes, round 1 (tested on the beta preview, Nov 12, about 12:10 AM PT)

Same rules as before: `beta` only, one commit per item, `npm run check` and `npm run build` after each, no em dashes in user-facing text, no env or secret changes, no production deploy, no repeated live model runs.

What passed: pixel topic map, RAG world banner (2/12 stars), dotted path, unlock after Level 2, chest open (+40 XP), correct and wrong sheets, CHECKING state with the thinking mascot, AI grading (Correct in 3.3 s), first-try bonus and combo XP (90 XP), light and dark themes, keyboard Enter flow.

1. Mascot hair disappears on the dark world. Hair #1b1b2f sits on a #17143a background, so on the path and level-complete screens she looks bald. Add a 1-pixel lighter outline around her silhouette (around #4a4380) or lighten the hair to a dark purple-gray with 2 to 3 highlight pixels. Also add small curl bumps on the hair edge so it reads as "open curly hair". Check it on dark and light.
2. Mascot is too small on the path (about 45 px). Render her at 2x pixel scale (about 80 x 100) on the path, level complete, level up and failed screens. Keep the small size in the answer sheet. On the path, put her within 24 px of the current node, with the speech bubble attached by a small pixel tail.
3. Stale resumed rounds. Level 2 resumed a round started 5 hours earlier: the drill timer showed "314:53" and the level complete "Answer time" showed "315:42".
   - Count only active time per drill (pause while the tab is hidden) and cap each drill at 3x its par time.
   - If a round has had no activity for 2 hours, regenerate its unanswered drills on resume (keep answered ones and their results).
   - Never show minutes over 99 anywhere; show hours and minutes if ever needed.
4. Messy numbers still appear. "Questions per day" values are not rounded: 841,167, 1,358,897 and 628,769 showed up in L2-03, L2-04 and L2-06 (documents were round, for example 19,000,000). Round every generated input: questions per day in steps of 10,000 (or 2 significant figures), all other inputs per the steps in rag-levels-1-2.md. Unanswered drills that were saved with old messy values should regenerate (same rule as item 3).
5. Answers are shown with too much precision: "7,338.0438 millions of tokens per day". Show answers rounded to 3 significant figures in friendly units ("about 7.3 billion tokens per day"). Show the worked math with the real numbers, not variable names: "1,358,897 x (5,000 + 400) = about 7.3 billion", instead of "q x (tin + tout)".
6. Chest opening has almost no celebration: the click turns straight into the "+40 XP" label. Add the 3-step lid open, a gold square burst and a big centered "+40 XP" in the pixel font for about 1.2 s (nothing moving with reduced motion).
7. CONTINUE on the green "NICE!" sheet is purple. Make it green on correct sheets. Keep the world color on wrong sheets.

When done: push to `beta`, check the preview, and send screenshots of: the path with the larger mascot (dark and light), a math result with the friendly answer and worked numbers, a chest opening mid-animation, and a resumed round timer.
