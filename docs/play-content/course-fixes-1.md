# RAG course fixes, round 1 (tested on the beta preview, Nov 12, about 11:45 AM PT)

Same rules as before: `beta` only, one commit per item, `npm run check` and `npm run build` after each, no em dashes in user-facing text, no env or secret changes, no production deploy, no repeated live model runs. Migrations only add.

What passed: 9-topic path (1 to 3 open, 4 to 9 SOON), slides with counter and NEXT/BACK, quiz with 4 options and keyboard 1 to 4, key idea + answer + open "Why", the "If wrong" line (picked 16M on T1-Q5 and saw "That forgets the overlap"), topic pass at 6 of 7 with 1 star, combo badge from 2, notebook showing answered questions and "Try it first" for the rest, no model calls.

1. Internal IDs are shown to players. The drill heading says "T1-Q1", the round summary lists "T1-Q5" under "Drills to review", and the notebook uses the IDs as titles. Add a short `title` per question and show it everywhere instead of the ID. Titles:
   - T1: Big chunks / Cut sentences / Split tables / Citation metadata / Chunk count / Stale chunks / Changed chunks
   - T2: Fast search / Cosine score / Float32 memory / Int8 memory / HNSW vs IVF / Model mismatch / IVF recall
   - T3: Error codes / Meaning match / RRF score / Follow-up queries / Multi-query cost / Old pricing / Multi-query latency
2. XP was lost. Before this change the account had about 290 XP and LV 2. After it, the HUD showed 40 XP and LV 1 before any new play. Retired content must still count: total XP, player level, badges and streak come from the full ledger, including attempts on retired drills. Restore it without rewriting history, and add a test.
3. First-try bonus missing: Topic 1 passed on the first try (6 of 7: five 10-XP questions and one 15-XP math question) but awarded 70 XP. Expected 65 + 25 first-try bonus + combo bonuses. Check the first-try rule for course topics and add a test.
4. The "First level cleared" badge was shown again on the Topic 1 result, though the account earned it before. Badges are once per account. For the course, add "First topic cleared" as a new badge, and don't re-show old ones.
5. Slides: the arrow keys did nothing (Right pressed 3 times stayed on 2/5), and each NEXT shows "SAVING..." before moving. Make arrow keys and Enter work, and move instantly; save slide progress in the background.
6. Enter didn't continue from the last question's result to the topic result; it needed a click. Fix.
7. First visit gate: START QUIZ showed above slide 1 on this account's first visit to Topic 1 (maybe your earlier preview check marked the slides as seen). Verify on a fresh account that the quiz is locked until the slides are seen once.
8. Slides look like plain text boxes with a lot of empty space. Add one small pixel diagram to these slides, drawn as simple original pixel shapes and labels:
   - T1 S1: the pipeline as a row of boxes with arrows (source, parse, chunk, metadata, embed, index)
   - T1 S2: two overlapping chunk bars showing the overlap
   - T1 S3: a small table split in half, with the header row only on one half
   - T2 S2: two towers (query encoder, doc encoder) meeting at a dot product
   - T2 S4: a tiny HNSW graph (dots and links) next to IVF clusters
   - T3 S2: two ranked lists merging into one (RRF)
   Also remove the trailing period from slide titles, and style BACK like the other pixel secondary buttons (it's teal today).

When done: push to `beta`, check the preview, and send screenshots of: a drill with its title, the round summary review list, the HUD with restored XP, and 3 slides with diagrams.
