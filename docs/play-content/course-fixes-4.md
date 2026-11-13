# Course fixes 4 (retest of Topic 0 + course-fixes-3)

Tested on the beta preview at 1440 x 725 (Ruchi's window), commit 664548c.
Target size for every acceptance check below: 1440 x 669 and 375 x 812.

Rules (same as before):
- Use isolated local fixture accounts only. Never Ruchi's account.
- No live model calls. No env or secret changes. No production deploy. Do not touch `main`.
- Answers, why and ifWrong stay server-only until answered.
- `npm run check` and `npm run build` after each item. One commit per item. Push `beta` at the end.
- No em dashes in any copy.

## 1. Learn page: slides start below the fold and get covered (High)

Measured on Topic 0 and Topic 1:
- The header block (Back to topics, TOPIC N · LEARN, title, START QUIZ, "Or review the slides below") pushes the slide frame to y=400. Only about 230 px of the slide is visible on load.
- The sticky controls bar has a top border that looks like the slide's bottom edge. Text looks cut off with no cue to scroll.
- Short slides have a 418 px min-height and show about 250 px of empty space.
- Diagram slides never fit in one view. Frame heights: T1 S2 650, S6 835, S8 678, S9 767 px.
- S6 and S9 diagrams are portrait (viewBox 320 x 248, drawn 404 x 313 px) even at 1440 wide.

Fix:
1. Collapse the header to one row: "Topic N · Title" on the left, a small "Start quiz" on the right (only when unlocked). Remove "Or review the slides below."
2. Remove the frame min-height.
3. On load and on every slide change, scroll so the frame top sits 12 px below the viewport top.
4. Redraw the S6 and S9 diagrams landscape at desktop widths (max 200 px tall). Keep the portrait version for widths under 600 px.
5. Cap all diagram heights at 220 px on desktop.
6. Controls bar: remove the top border line. Add a 24 px fade above it only when slide content continues underneath.

Acceptance (Playwright, 1440 x 669, every slide in Topics 0 to 3):
- After the auto-scroll, the frame bottom is visible above the controls, or the fade cue is visible.
- No slide has more than 60 px of empty space below its last line.
- Arrow keys and Enter still work.

## 2. Quiz: 4th option hidden under the Check bar at 669 tall (Medium)

At 725 tall, options end at y=632 and the sticky Check bar starts at 648. At 669 tall the bar starts near 592, so option 4 sits under it.

Fix: reduce the question title from about 56 px to 32 px and tighten the spacing above "Your answer".

Acceptance (1440 x 669, all Topic 0 to 3 questions): all four options and the Check bar are fully visible without scrolling when each option is one line.

## 3. Slides overlay opens on the wrong slide (Medium)

During Topic 0 Q1 the overlay opened on slide 10 (the last slide viewed).

Fix: give each question a `slide` reference (server-side metadata is fine) and open the overlay on that slide. Fall back to slide 1.

Mapping for Topic 0: Why RAG S1, Open book S2, Fresh docs S3, Fine-tune or RAG S5, Two models S7, Meaning match S6, Count the vectors S8, Every question S8.
Mapping for Topic 1: Big chunks S6, Cut sentences S6, Split tables S8, Citation metadata S10, Chunk count S6, Stale chunks S11, Changed chunks S11.
For Topics 2 and 3, map each question to the closest slide.

Also add a "See slide N" link to the wrong-answer panel. It opens the overlay on that slide.

## 4. Path does not scroll to the current topic (Medium)

A returning player lands on the header and empty space. The current node ("Ready for Topic 2?") is about two screens down.

Fix: on /play/rag load, scroll the current node to the vertical center. Respect reduced motion (jump, no smooth scroll).

## 5. "World unlocked" is a static box, not a moment (Medium)

From artifacts/rag-primer/world-unlocked-1440.png:
- It's a flat banner above the path. It doesn't say what opened up.
- The "LET'S GO DEEPER" speech bubble has a button-like border and looks clickable.
- The main action "Keep going" is a secondary button.
- In light mode the brown connector from Topic 0 to Topic 1 looks muddy.

Fix:
1. Copy: "WORLD UNLOCKED" then "9 topics open up. Next: Ingestion and chunking."
2. Primary button "Start Topic 1" that goes straight to /play/rag/topics/1. Secondary text link "Later".
3. Restyle the bubble as a speech bubble with a tail, no button border.
4. Light the connector from Topic 0 to Topic 1 in XP gold, pulse the Topic 1 node once, and scroll Topic 1 into view.
5. Keep the reduced-motion behavior.

## 6. Topic 0 questions are too easy to guess (Medium, content)

The correct option is the longest or most specific in 5 of 8 questions. Several distractors are throwaway. "They're both lowercase" is also false, since "Reset my password" starts with a capital.

Replace the distractors below. Keep the questions, correct answers, key ideas and why lines as they are. Each new distractor has its own ifWrong line.

Q1 Why RAG (correct: "LLMs don't know your private or recent data, so they guess")
- LLMs forget earlier turns in a long chat, so they lose track | ifWrong: That's conversation memory. RAG is about knowledge the model never had.
- LLMs answer too slowly, so search makes responses faster | ifWrong: RAG adds a search step, so it usually adds a little latency.
- LLMs can't follow formatting rules without extra examples | ifWrong: Formatting is a prompting or fine-tuning job, not retrieval.

Q2 Open book (correct: "Relevant pieces of your documents are retrieved and added to the prompt")
- The model is briefly fine-tuned on the matching documents | ifWrong: Nothing is trained at question time. The pieces go into the prompt.
- The whole document collection is pasted into the prompt | ifWrong: Only the top few relevant pieces fit and help. That's why we search.
- The question is matched to a cached answer from a past user | ifWrong: A cache can sit in front of RAG, but RAG itself retrieves documents.

Q3 Fresh docs (correct: "Re-index the updated document")
- Increase the LLM's context window | ifWrong: A bigger window doesn't help if the new text never gets retrieved.
- Retrain the LLM on the new policy | ifWrong: Retraining is slow and costly, and RAG exists so you don't have to.
- Switch to a newer embedding model | ifWrong: The models are fine. The index still holds the old text.

Q4 Fine-tune or RAG (correct: "Make the model always answer in your support team's tone and format")
- Answer questions about each customer's contract terms and renewal dates | ifWrong: Contracts are private facts that change. That's RAG.
- Answer questions about this week's support tickets and their status | ifWrong: Tickets change daily. Retrieval keeps up; fine-tuning can't.
- Cite the exact HR handbook section behind each answer | ifWrong: Citations need the source text in the prompt. That's RAG.

Q5 Two models (correct: "The embedding model turns text into a vector; the LLM writes the answer text")
- The LLM turns text into vectors; the embedding model writes the answer | ifWrong: Swapped. The embedding model makes vectors; the LLM writes.
- Both are the same model, called in two different modes | ifWrong: They're usually separate models with different sizes and jobs.
- The embedding model is the larger one, so it only runs at indexing time | ifWrong: It's usually smaller, and it also runs on every question.

Q6 Meaning match (correct: "Their embeddings are close because their meanings are similar")
- The search engine expands each query with a synonym list | ifWrong: Synonym lists help keyword search. Vector search matches meaning directly.
- An LLM rewrites every question before the search runs | ifWrong: Rewriting can help, but vector search matches these even without it.
- Keyword search on word stems finds a shared root | ifWrong: They share no words or stems. Only meaning connects them.

Q7 Count the vectors: replace the option "12" with "1,012" | ifWrong: Multiply, don't add. Each of the 1,000 documents has 12 chunks.

Q8 Every question (correct: "Embed the question, search for nearby chunks, then call the LLM")
- Re-embed the documents that match the question, then search | ifWrong: Documents are embedded once, offline. Only the question is embedded live.
- Split the matching documents into chunks, then call the LLM | ifWrong: Chunking happens offline, before any question arrives.
- Rebuild the vector index for the user's documents, then search | ifWrong: The index is built ahead of time and updated when documents change.

Also add a content-compiler warning: flag any topic where the correct option is the longest in more than half of its questions.

## 7. Replay XP: combos are not halved (Low)

A Topic 0 replay with 7 of 8 correct gave 52 XP: 37 from half-XP answers plus 15 from full combo bonuses. The rule is that replays earn half XP. Halve the combo bonuses on replays too (+2 at 3, +5 at 5). On the replay result screen, add one line under the XP: "Replay: half XP."

## 8. Small fixes (Low)

1. The RAG World description is stale: "Retrieval, permissions and answer quality." Change it to "From RAG basics to a production design, one topic at a time."
2. Path button hierarchy: finished topics ("Practice again") use the same filled violet as the current topic. Make finished topics outline/secondary so the current topic is the only filled button.
3. Wrong-answer panel: "Take another look." suggests a retry that doesn't exist. Replace it with the "See slide N" link from item 3.
4. Future migrations: wrap constraint drop and add pairs in `begin; ... commit;` so a failed add can't leave a table without its check.

## Report

Write docs/reviews/course-fixes-4.md with one short section per item: what changed, which test covers it, and screenshots under artifacts/course-fixes-4/ (1440 x 669, both themes). Then push `beta`.
