# Course content 2: Topic 2 and 3 v2, Topic 1 question fixes

Do this now. Skip course-fixes-5.md; it's deferred.

Source files (wording is final, don't rewrite it):
- rag-course/topic-2-v2.md: 13 slides, 10 questions. Replaces all Topic 2 slides and questions.
- rag-course/topic-3-v2.md: 12 slides, 10 questions. Replaces all Topic 3 slides and questions.
- rag-course/topic-1-questions-v2.md: new wrong options and If wrong lines for the 7 Topic 1 questions. Topic 1 slides don't change.

Rules: fixture accounts only, no live model calls, no env or secret changes, no production deploy, no `main`, no em dashes. `npm run check` and `npm run build` per item, one commit per item, push `beta` at the end.

## 1. Compile the new content

1. Extend the strict compiler (like parse-primer.mjs) to read these three files. Each question has a title, a Slide reference, 4 options with exactly one ✓, Key idea, Why, and one If wrong line per wrong option. Fail the build on any mismatch.
2. Keep the existing question IDs (T1-Q1 to T1-Q7, T2-Q1 to T2-Q7, T3-Q1 to T3-Q7) so saved attempts, reviews and stars still link up. T2-Q8 to T2-Q10 and T3-Q8 to T3-Q10 are new.
3. Questions, answers, Key idea, Why and If wrong lines stay server-only until answered. Slides stay public.
4. Use the `Slide:` line as each question's slide reference (it replaces the course-fixes-4 mapping for these topics).
5. Don't rewrite saved question snapshots or past attempts. Reviews already queued for an old question use the new version of that question.
6. The length-cue warning must not fire for Topics 1, 2 or 3. Expected counts: Topic 1 is 1 of 7, Topic 2 is 0 of 10, Topic 3 is 2 of 10.

## 2. Topic size and passing

1. Topics 2 and 3 grow from 7 to 10 questions. Pass stays at 75%, so 8 of 10 passes.
2. Stars and XP rules don't change. Existing passes and stars stay as earned.
3. Update the path labels: Topic 2 and Topic 3 get "About 15 min". Topic 1 gets "About 15 min" too.

## 3. Diagrams (9 new)

Same style as the Topic 1 and primer diagrams. Every diagram is landscape at desktop (max 200 px tall) and portrait below 600 px wide. Gold marks the key element. Readable in both themes. Each SVG gets a short text alternative.

Topic 2: S2 (vectors and angle), S3 (two lanes into Similarity), S8 (HNSW layers with a gold path), S9 (IVF clusters, nprobe = 2, one missed dot), S11 (filter after vs filter during).
Topic 3: S4 (hybrid merge), S5 (RRF three columns, updated to the new example), S7 (multi-query fan-out), S9 (retrieval funnel).

Remove the old Topic 2 "two-tower" and "ann" diagrams and the old Topic 3 "rrf" diagram if nothing else uses them.

## 4. Tests

1. A content contract test for each file: slide count, question count, IDs, one ✓, If wrong coverage and slide references in range.
2. Grade every option of every new or changed question through the static server grader.
3. Browser: all Topic 2 and 3 slides at 1440 x 669 and 375 x 812, both themes. Check no horizontal overflow and that each diagram is 200 px tall or less at desktop.
4. Browser: a full Topic 2 pass and a full Topic 3 pass on fixture accounts, including one wrong answer that opens "See slide N" on the right slide.
5. The browser-chunk scan still finds no private question content.

## Report

Write docs/reviews/course-content-2.md (what changed, tests, and screenshots of each new diagram in both themes under artifacts/course-content-2/), then push `beta`.
