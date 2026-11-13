# Play: learn from every question

**Superseded by `rag-course-build.md`. Do not follow this file.**

Goal: every drill teaches, not just scores. After a player answers, they always see the right answer and a short explanation, and they can review every question they've tried.

Same rules as before: `beta` only, one commit per item, `npm run check` and `npm run build` after each, no em dashes in user-facing text, no env or secret changes, no production deploy, no repeated live model runs. Answers, rubrics and explanations stay server-only until the player has answered that drill.

1. Answer sheet, every drill type, correct and wrong:
   - A bold one-line "Key idea" at the top (add a `keyIdea` field per drill, written from its "Why" text; I'll review them).
   - The right answer.
   - "Why" OPEN by default (today it's collapsed on correct answers).
   - Keep "Read the gap card" where one exists.
2. Written drills (Pick the probe, Trade-off call): after grading, also show "A strong answer" (the drill's Senior answer) and "What a good answer covers" as 2 to 3 plain bullets made from the rubric's pass points. Show these only after the player's answer is saved and graded, never before.
3. Math drills: show the worked math with the player's actual numbers and a friendly rounded result (see pixel-fixes-1.md item 5).
4. World notebook: a new "Notebook" link on each world page and in the round summary.
   - Lists every drill in that world, grouped by level, in the same order as the path.
   - Drills the player has answered: question, their result (right or not), the key idea, the right answer and the "Why". Written drills also show the strong answer.
   - Drills not answered yet: title only, with "Try it first" and a link to that level. No answer shown.
   - Math drills: show the formula and one worked example.
   - Clean Inter layout, pixel style only for the headings and level labels.
5. Tests: answers and explanations never appear in a client bundle or API response before the drill is answered; the notebook hides unanswered drills; "Why" is open by default.

When done: push to `beta`, check the preview, and send screenshots of: a correct sheet with the key idea, a written-drill result with the strong answer, and the RAG notebook (some answered, some locked).
