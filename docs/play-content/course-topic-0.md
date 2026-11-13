# Add Topic 0 "RAG basics" before Topic 1

Do this after `course-fixes-3.md`. Same rules as before: `beta` only, one commit per item, `npm run check` and `npm run build` after each, no em dashes in user-facing text, no env or secret changes, no production deploy, no live model runs, test accounts only.

Content: `docs/play-content/rag-course/topic-0-primer.md` (10 slides, 8 questions). Keep the wording as written.

1. Add Topic 0 "RAG basics" as the first node on the RAG path, before "Ingestion and chunking". Show "About 8 min" on its node. It's always open.
2. Unlock rules: new players must pass Topic 0 to unlock Topic 1. Players who already started or passed Topic 1 keep access; for them Topic 0 is optional.
3. Same flow as other topics: slides, then quiz, pass at 75% (6 of 8), same XP, stars, combos and review rules. Question titles come from the content file ("Why RAG", "Open book", and so on).
4. Diagrams for S2, S7 and S8 as clean vector SVG, the same style as the Topic 1 diagrams.
5. Make passing it feel like the start of the game:
   - New badge "RAG Rookie" on first pass.
   - After the result screen, a short "World unlocked" moment: the path animates from Topic 0 to Topic 1, the Topic 1 node lights up, and the mascot says "Let's go deeper". No movement with reduced motion.
6. Stars total in the RAG banner includes Topic 0 (10 topics).
7. Tests: Topic 0 gates Topic 1 for new players only; existing Topic 1 progress is untouched; the badge is awarded once; the slides render at 1440 x 669.

When done: push to `beta`, check the preview with a test account, and send screenshots of: the path with Topic 0 first, slides S2, S7 and S8, a quiz question, the result screen, and the "World unlocked" moment.
