# Course content 4: open Topics 7, 8 and 9 (completes RAG World)

Do this now. course-fixes-5.md stays deferred.

Source files (wording is final, don't rewrite it):
- rag-course/topic-7-v1.md: Evaluation. 12 slides, 4 diagrams, 10 questions.
- rag-course/topic-8-v1.md: Freshness, scale and serving. 12 slides, 4 diagrams, 10 questions.
- rag-course/topic-9-v1.md: Failure modes and safety. 12 slides, 4 diagrams, 10 questions.

Same format and compiler as Topics 4 to 6.

Rules: fixture accounts only, no live model calls, no env or secret changes, no production deploy, no `main`, no em dashes. `npm run check` and `npm run build` per item, one commit per item, push `beta` at the end.

## 1. Compile the content

1. Run the three files through the strict v2 compiler. Question IDs are T7-Q1 to T7-Q10, T8-Q1 to T8-Q10 and T9-Q1 to T9-Q10.
2. Questions, answers, Key idea, Why and If wrong lines stay server-only until answered. Slides are public.
3. Expected length-cue counts: Topic 7 is 0 of 10, Topic 8 is 1 of 10 (a number option), Topic 9 is 2 of 10. There should be no warnings.
4. The notebook shows all 10 topics with slides.

## 2. Open Topics 7 to 9 on the path

1. Topics 7, 8 and 9 are playable. Each unlocks when the previous topic is passed. No topic in RAG World stays SOON.
2. Path labels: "About 15 min" for Topics 7 to 9.
3. Update the path copy to "All 10 RAG topics are open in this beta."
4. The chest after Topic 9 must open after a Topic 9 pass. Test it on a fixture account, including a refresh after opening it.
5. Pass rule, stars, XP, combos, the first-try bonus and the review queue are unchanged. 8 of 10 passes.
6. Confirm "10 of 10 cleared" and the 30-star total work when every topic is passed.

## 3. Diagrams (12 new)

Same style as Topics 4 to 6: landscape at desktop (max 200 px tall), portrait below 600 px wide, Inter labels of at least 13 px, theme tokens, gold for the key element, a text alternative for each, and no chart library.

- Topic 7: S1 (retrieval vs generation metrics), S4 (ranked list with reciprocal rank 0.5), S6 (LLM judge plus human agreement), S7 (regression gate bars, faithfulness blocked)
- Topic 8: S2 (online and offline serving rows sharing the indexes), S3 (index lag timeline), S5 (router, 4 shards with replicas, merge), S9 (degradation staircase)
- Topic 9: S1 (four stages with failure buckets), S3 (direct vs indirect injection paths), S4 (three gates: permission filter, user confirms, output filter), S11 (1%, 10%, 50%, 100% rollout with rollback arrows)

The red X and red arrows in T9 S1 and S11 use the existing "wrong" red. Green appears only in T6 S5 and T6 S6.

## 4. Tests

1. Content contract tests for all three files: slide counts, question counts, IDs, one ✓, If wrong coverage, and slide references in range.
2. Grade all 120 options through the static server grader.
3. Browser: every Topic 7 to 9 slide at 1440 x 669 and 375 x 812, both themes. No horizontal overflow, and each diagram is at most 200 px tall on desktop.
4. Browser: a fresh fixture account passes Topics 0 to 9 in order (8 of 10 each, the primer at its own rule), gets one wrong answer per topic that opens "See slide N" on the right slide, opens the chests after Topics 3, 6 and 9, and sees "10 of 10 cleared".
5. The private-content browser-chunk scan still passes.

## Report

Write docs/reviews/course-content-4.md (what changed, tests, and a contact sheet of all 12 diagrams in both themes under artifacts/course-content-4/), then push `beta`.
