# RAG course beta

Source: `docs/play-content/rag-course-build.md` and the unchanged authored text in `docs/play-content/rag-course/topics-1-3.md`. `learn-mode.md` is superseded and was not used.

## Sections

1. Content: `scripts/build-rag-course.mjs` compiles the Markdown into `src/lib/play/course/rag.json`. The private schema checks four choices, one answer, a key idea and teaching feedback. All 21 questions and 15 slides come from the supplied text. The compiler supports additional `topics-*.md` files.
2. Path: `CourseWorld`, `CoursePath` and public course metadata show nine topics, with 1 to 3 playable, 4 to 9 marked SOON, and chests after 3, 6 and 9. Old passes do not unlock this path.
3. Flow: `course/visits.ts`, `/api/play/slides` and `CourseSlides` enforce the first-visit slide gate. Quiz creation saves every question and its shuffled choice order. The existing transaction, owner lock, active clock, review queue and rewards handle the course. Course rules require 75 percent rounded up and use the same 45-second visible-time bar for every question. Math earns 15 XP; concept and flaw questions earn 10. Passing a first attempt adds 25. Replays of passed topics use the existing integer half-XP rule. Combos are unchanged.
4. Retirement: all public Play commands check the stored course identity. Retired rounds cannot reach grading, including forged requests from old tabs. Typed input controls are removed from Play. Old content, grader code, attempts, grades, badges, streaks and XP remain. Mock grading is unchanged; its readiness hook records current-course readiness. The privacy notice now explains that Play course choices are not sent to a model.
5. Notebook: `/play/rag/notebook` shows slides in path order. Only an owner's submitted attempts expose a question's prompt and saved solution. Unanswered entries contain only the authored question ID and a Try it first link. The original question IDs serve as titles because the source supplies no separate titles.
6. Verification: config, private projections, actual Postgres/RLS, ordered visits, ownership, idempotency, review intervals, replay XP and browser behavior have dedicated coverage. The browser bundle scan includes course prompts and feedback. Updated browser stories replace the retired placement and written-answer UI checks. Mock browser regressions remain.

## Persistence and rollout

The course uses `rag-course` as its persisted progress identity. Old `rag` rows remain unchanged. Global XP and badges are shared, while new topic passes and stars begin independently. RAG readiness requires all nine topics; clearing only the three available topics does not claim full-course readiness.

`20261112184249_play_rag_course_visits.sql` adds one private owner-scoped table. Browser roles can read their own visits but cannot write them. The existing reporting role writes under the verified owner context. Applying the migration twice is safe. It has been applied to the existing IntelliPrep database and its RLS and grants verified. No existing records were updated or deleted. Other environments can apply it with `npm run db:play` using their operator connection.

All course questions use the existing persisted single-choice representation internally. `courseKind` supplies the public concept, flaw or math label. Public projections never include the correct index or teaching feedback before submission. Server-saved answers, grades and rewards fence retries. The notebook uses the latest submitted snapshot, rather than rewriting earlier attempts when content changes.

## Evidence

Checks and builds are recorded per section under ignored `.playwright-mcp/rag-course/`. Browser tests use only local Auth/Postgres/model fixtures. The Play stories compare the model request count before and after and require no increase. The long multi-topic browser story is paced within the unchanged 120-request-per-minute guard, rather than increasing app limits.

Requested screenshots live outside Git in `artifacts/rag-course/`: the nine-topic path, a slide, the last slide, a math question, a wrong answer with option-specific feedback, topic completion and the notebook, each at 1440 and 375 pixels. Additional path captures cover both themes. Preview publication is beta-only; main, Production, environment variables and secrets are unchanged.

Final local verification: 1,828 unit/integration tests passed, with two existing skips. All 33 production-browser tests passed, including the six course stories and existing Mock, auth, feedback, theme and whiteboard regressions. The evidence gallery contains 18 screenshots. No live model tests or benchmarks were run.
