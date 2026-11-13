# Course content 3: open Topics 4, 5 and 6

Do this now. course-fixes-5.md stays deferred.

Source files (wording is final, don't rewrite it):
- rag-course/topic-4-v1.md: Re-ranking. 12 slides, 4 diagrams, 10 questions.
- rag-course/topic-5-v1.md: Context assembly and prompt building. 12 slides, 4 diagrams, 10 questions.
- rag-course/topic-6-v1.md: Generation. 12 slides, 4 diagrams, 10 questions.

Same format as topic-2-v2.md: a `Slide:` reference per question, one ✓ per question, and one If wrong line per wrong option.

Rules: fixture accounts only, no live model calls, no env or secret changes, no production deploy, no `main`, no em dashes. `npm run check` and `npm run build` per item, one commit per item, push `beta` at the end.

## 1. Compile the content

1. Run the three files through the existing strict v2 compiler. Question IDs are T4-Q1 to T4-Q10, T5-Q1 to T5-Q10 and T6-Q1 to T6-Q10.
2. Questions, answers, Key idea, Why and If wrong lines stay server-only until answered. Slides are public.
3. Expected length-cue counts: Topic 4 is 1 of 10, Topic 5 is 1 of 10, Topic 6 is 1 of 10. There should be no warnings.
4. The notebook shows Topics 4 to 6 slides, plus "Try it first" for unanswered questions.

## 2. Open Topics 4 to 6 on the path

1. Topics 4, 5 and 6 are playable. Each unlocks when the previous topic is passed, the same as Topics 1 to 3. Topics 7 to 9 stay SOON.
2. Path labels: "About 15 min" for Topics 4 to 6.
3. Update the path copy to "Topics 0 to 6 are open in this beta."
4. The chest after Topic 6 must now open after a Topic 6 pass. Test it on a fixture account, including a refresh after opening it.
5. Pass rule, stars, XP, combos, the first-try bonus and the review queue are unchanged. 8 of 10 passes.
6. The world banner's "N of 10 cleared" and the star total (out of 30) need no change. Confirm they count Topics 4 to 6.

## 3. Diagrams (12 new)

Same style as Topics 2 and 3: landscape at desktop (max 200 px tall), portrait below 600 px wide, Inter labels of at least 13 px, theme tokens, gold for the key element, and a text alternative for each.

- Topic 4: S2 (bi-encoder vs cross-encoder), S3 (two-stage pipeline with latencies), S6 (recall@N curve with the bend at 50), S8 (without vs with MMR)
- Topic 5: S1 (prompt anatomy bar), S3 (lost-in-the-middle U curve), S9 (injected doc treated as data, plus permissions filter), S10 (cached prefix bar)
- Topic 6: S2 (model router), S5 (citation check: one supported, one not), S6 (claim-by-claim faithfulness check), S8 (latency timeline with first word at 830 ms)

Charts (T4 S6, T5 S3) are simple drawn curves, not data charts. No chart library.

## 4. Tests

1. Content contract tests for all three files: slide counts, question counts, IDs, one ✓, If wrong coverage, and slide references in range.
2. Grade all 120 options through the static server grader.
3. Browser: every Topic 4 to 6 slide at 1440 x 669 and 375 x 812, both themes. No horizontal overflow, and each diagram is at most 200 px tall on desktop.
4. Browser: a fresh fixture account passes Topics 0 to 6 in order (8 of 10 each), gets one wrong answer per topic that opens "See slide N" on the right slide, and opens the Topic 6 chest.
5. The private-content browser-chunk scan still passes.

## Report

Write docs/reviews/course-content-3.md (what changed, tests, and a contact sheet of all 12 diagrams in both themes under artifacts/course-content-3/), then push `beta`.
