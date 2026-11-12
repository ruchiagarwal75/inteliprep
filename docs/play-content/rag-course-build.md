# RAG world becomes a course: topics with slides and multiple-choice questions

Ruchi approved a new structure for the RAG world. Each path node is a TOPIC. A topic = teaching slides, then 6 to 8 multiple-choice questions. No typed answers anywhere in Play.

This replaces `learn-mode.md` (don't follow that file; its useful parts are folded in below). Content for topics 1 to 3 is in `docs/play-content/rag-course/topics-1-3.md`. Topics 4 to 9 come later.

Same rules as before: `beta` only, one commit per section, `npm run check` and `npm run build` after each, no em dashes in user-facing text, no env or secret changes, no production deploy, no repeated live model runs. Keep the pixel look. Rewards stay server-decided.

## 1. Content model
- World > topics (ordered) > slides (3 to 6) + questions (6 to 8).
- Question: id, type (`concept` | `flaw` | `math`), prompt, exactly 4 options, the correct option, `keyIdea`, `why`, and optional `ifWrong` text per wrong option.
- All question types are single choice. Math questions are single choice too; their wrong options are common mistakes.
- Slides: title, 1 to 4 short lines, optional small pixel diagram. Slides are not secret and can be public.
- Questions, answers, `keyIdea`, `why` and `ifWrong` are server-only until that question is answered (same rule as today).
- Source of truth for content: the markdown files in `docs/play-content/rag-course/`. Convert them into the server-only content module. Don't invent or rewrite content; if something is unclear, ask me.

## 2. The 9 RAG topics (path order)
1. Ingestion and chunking
2. Embeddings and the vector store
3. Retrieval strategy
4. Re-ranking
5. Context assembly and prompt building
6. Generation
7. Evaluation
8. Freshness, scale and serving
9. Failure modes and safety

Topics 1 to 3 are playable now. Topics 4 to 9 show on the path as locked "SOON" nodes with their titles. Chests after topics 3, 6 and 9.

## 3. Topic flow
- Tap a topic node: LEARN (slides) then QUIZ.
- Slides: one card at a time in the pixel frame, a slide counter ("2 / 5"), BACK and NEXT pixel buttons, arrow keys and Enter work, a "Start quiz" button on the last slide. Slide text in Inter, slide titles in the pixel font.
- First visit: slides must be seen once before the first quiz. After that, "Review slides" is optional and the quiz can start right away.
- Quiz: the existing drill screen with 4 option cards (keys 1 to 4, Enter). Shuffle options per attempt.
- After each answer, the sheet shows: the key idea (bold, top), the right answer, "Why" open by default, and the `ifWrong` line if the player picked that wrong option.
- Pass: at least 75% correct (5 of 6, 6 of 7, 6 of 8). Stars: pass = 1, all correct = 2, all correct with no question over 45 s of visible time = 3.
- XP: 10 per correct concept or flaw question, 15 per correct math question, +25 first-try pass, combos as today. Replays at half XP.
- Missed questions go to the review queue (2, 5 and 12 days), as today.

## 4. Remove typed answers from Play
- Remove "Pick the probe" and "Trade-off call" from the RAG world. Keep the AI grader code (Mock still uses AI), but Play makes no model calls anymore.
- Remove the old 4-level RAG content from the path. Keep it in the codebase marked retired, and keep all player data (XP, streak, badges, attempts). Nothing existing is dropped from the database; migrations only add.
- Players who already passed old levels keep their XP and badges and start the new topics at topic 1.

## 5. RAG notebook
- A "Notebook" link on the RAG world page and on the topic complete screen.
- Grouped by topic in path order. Each topic shows its slides (always) and its questions:
  - answered questions: the prompt, the player's result, key idea, right answer and "Why"
  - not answered yet: the title only, with "Try it first" and a link to that topic
- Clean Inter layout, pixel font only for headings.

## 6. Tests
- Content parser: every question has 4 options, exactly one correct, a key idea and a why.
- Answers and explanations never reach the client or an API response before the question is answered; slides do.
- Topic flow: slides required on first visit, optional after; pass at 75%; stars rules; half XP on replay; review queue.
- Notebook hides unanswered questions.
- No model calls happen anywhere in Play.

## When done
Push to `beta`, check the preview, and send screenshots at 1440 and 375 of: the RAG path with 9 topic nodes, a slide, the last slide with "Start quiz", a math question, a wrong answer sheet with the `ifWrong` line, the topic complete screen, and the notebook.
