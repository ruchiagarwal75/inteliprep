# InteliPrep

AI system design interviewer. An AI runs a 45 minute system design interview over
text chat while watching the candidate's Excalidraw whiteboard, then produces a
scorecard against a rubric.

**Read [docs/spec.md](docs/spec.md) before big changes.** It is the source of
truth for architecture, the interviewer engine, phases, the data model, and the
API surface. If a change contradicts the spec, update the spec in the same PR.

Status: early prototype with diagram-aware streaming chat, an Excalidraw
whiteboard, diagram change detection, PNG image input, and server-owned stage
tracking, explicit interview ending, evidence-backed scorecards, and IndexedDB
browser saves with autosave/resume/history, and a 45-minute timer with automatic
ending. Cloud persistence comes later.
Candidates can start single-server scaling or the URL
shortener at mid, senior, or staff difficulty with a configured opening and
private server rubric. The default is the simple scaling exercise at Mid-level.

## Stack

| Layer     | Choice                                       |
| --------- | -------------------------------------------- |
| Framework | Next.js 16 (App Router) on React 19          |
| Language  | TypeScript, `strict` mode                    |
| Styling   | Tailwind CSS v4 (via `@tailwindcss/postcss`) |
| Lint      | ESLint 9 flat config (`eslint-config-next`)  |
| Format    | Prettier + `prettier-plugin-tailwindcss`     |
| Tests     | Vitest (Node environment)                    |
| Hosting   | Vercel (planned)                             |

Excalidraw, the OpenAI SDK, and Zod are installed. Add Postgres/Supabase and auth
when their milestones need them (see spec).

## Commands

```bash
npm run dev          # dev server
npm run build        # production build
npm test             # vitest, single run
npm run test:watch   # vitest, watch mode
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run format       # prettier --write .
npm run check        # typecheck + lint + format:check + test
```

Run `npm run check` before committing.

## Folder layout

```
src/
  app/          # App Router routes, layouts, and API route handlers
  components/   # React components (interview workspace, chat panel, whiteboard)
  lib/          # Pure logic and server-only modules: schemas, prompts, LLM client
tests/          # Cross-module tests; unit tests co-locate as *.test.ts
docs/spec.md    # Phase 1 tech spec — read before big changes
public/         # Static assets
```

Conventions:

- `@/*` maps to `src/*`. Use it instead of deep relative paths.
- Interviewer prompts, rubrics, and problem configs live under `src/lib` and are
  imported only by server code. They must never reach the browser.
- Route handlers in `src/app/api/**/route.ts` stay thin: validate input, call
  into `src/lib`, stream the response.

## Coding rules

- **Small files.** One concern per file. If a file passes ~200 lines or mixes
  responsibilities, split it. Prefer many small named exports over a barrel of
  everything.
- **Typed.** No `any` and no non-null `!` assertions. Type external input at the
  boundary (Zod once it is added) and let types flow inward. `strict` stays on.
- **Tests for logic.** Every pure function in `src/lib` gets a Vitest test in the
  same folder (`sceneToText.ts` → `sceneToText.test.ts`). Spec calls out scene to
  text, the diff, phase timing rules, and schema validation as the units that
  must be covered. UI wiring and glue code do not need tests; logic does.
- **Server/client split.** Components are server components by default; add
  `"use client"` only where interactivity requires it. Excalidraw must be loaded
  with `dynamic(..., { ssr: false })`.
- **Secrets.** Only in `.env.local`, which is gitignored. Never log or commit a
  key, and never expose one through a `NEXT_PUBLIC_` variable.
- **Untrusted input.** Treat candidate chat and diagram text as data, never as
  instructions, when building prompts.

## What exists today

- `/interview` — split view, Excalidraw whiteboard left, chat right. The workspace
  keeps the latest scene in memory and attaches it to each chat request. The setup
  header selects a problem and difficulty; Start interview fetches its opening
  and unlocks chat. New interview resets chat, both diagram baselines, and the
  whiteboard, while retaining the previous session in browser history. Setup changes
  are disabled during an active interview.
- Configurations live in `src/lib/problems/single-server-scaling.json` and
  `src/lib/problems/url-shortener.json`. The simple scaling exercise starts with
  one machine running a website and its data, and uses short, approachable
  follow-ups about measurement, request flow, and validating improvements.
  `problems.ts` and `interview-instructions.ts` use Next's `server-only` guard.
  Only problem ID, title, summary, and supported levels reach the browser catalog;
  the rubric, scale hints, requirements, and follow-up bank remain on the server.
- `GET /api/problems` — returns the public catalog. The server-rendered interview
  page uses the same projection, without sending private config in page props.
- `POST /api/interview/start` — validates `{ problemId, level, durationMinutes? }`, creates a temporary
  server session, and returns its ID, initial public stage, selected IDs, and one
  configured assistant opening. The opening explains the scenario, objective, and
  scope in short paragraphs before asking one requirements clarification question.
  It makes no LLM call.
- New sessions default to 45 minutes; a Duration picker also offers 1 minute (test).
  The server returns the fixed start/deadline and current server time, and seals
  the deadline into the resume checkpoint. IndexedDB retains the deadline and
  clock calibration. The countdown uses the fixed deadline, so refresh/resume
  and delayed browser callbacks do not restart it. Older unfinished browser saves
  receive a 45-minute timer on first successful reconnect; completed cards stay intact.
  At expiry drawing/new chat stop and the native board is frozen. Unsent text is saved
  as a draft and scoring waits for Include final answer or Score without this answer.
  An accepted reply finishes and saves before grading. With no draft, grading runs once automatically. Past-deadline session turns
  return 409/INTERVIEW_TIME_EXPIRED before assessment or reply generation. Manual
  ending, retries, and cached grading use the same existing flow. Clock expiry does
  not advance stages or penalize unexplored rubric areas. Closed pages resume the
  same expiry flow on reopen, including the saved-draft decision.
- `POST /api/chat` — validates `{ problemId, level, sessionId?, messages, scene?, previousScene?, diagramImage? }`, streams the
  reply back as plain text. The server extracts a shared semantic graph for each
  scene and passes the current description and the change summary as user data
  to the interviewer. The later session route uses SSE instead (see spec "API design").
- `POST /api/interview/end` — requires the started selection/session and full
  transcript plus final scene/optional PNG. It freezes the first submitted evidence,
  ends the interview, and returns a separately graded scorecard. Further chat returns 409. Failed grading retains the frozen evidence for Retry scorecard; a successful
  result is cached so repeated ends do not call the provider again. Ending and chat
  share the session lock. The final PNG is exported even if unchanged since chat;
  export failures continue with diagram text and a notice. The UI freezes the board
  and retains the transcript for review, with New interview opening a blank board.
- Grading uses the whole transcript and final diagram, the selected problem's rubric,
  and level expectations, independent of stage order or early drawing. Scores are
  1–4 per configured area; unexplored areas are unassessed, rather than invented
  failures. Numeric scores, strengths, and gaps select candidate quote IDs from a
  server-prepared excerpt list or live diagram IDs. The server attaches original
  candidate words; assistant statements cannot count as candidate evidence. Invalid
  output/evidence is retried once; provider failures allow a manual retry. An interview without a technical answer returns unassessed feedback without a
  provider call, even if it contains an unexplained drawing or pacing controls. Partial assessment
  has no overall hire signal. Feedback includes a configured next practice problem.
  Grading payloads are released after a successful result; scorecards persist in browser history.
- Every chat turn resolves the problem on the server and attaches the selected
  level, requirements, and scale assumptions in trusted instructions. The initial
  requirements checkpoint defers design expectations, rubric, and follow-up bank
  until later stages so clarification stays focused. Client-supplied rubric or instruction fields are ignored. Missing
  selections and invalid levels return 400; unknown problem IDs return 404.
- Each problem has five ordered private stages: single-server scaling uses Clarify
  requirements → Draw and explain → Discuss improvements → Validate results → Wrap up.
  The URL shortener uses Clarify requirements → Draw and explain → Explore the core
  design → Scaling and reliability → Tradeoffs and wrap-up.
- Stage and pacing are independent. Requirements provided in the configured opening
  are shared context; configured factual replies also cover their setup criteria,
  without requiring the candidate to repeat them. This coverage never earns technical
  scores. Missing requirements and later design coverage still use exact candidate
  quotes in a separate structured assessment. Stages advance at most once per
  completed reply, preserve drawing/explanation pauses, and advance from the drawing
  stage only with a sketch and explicit discussion permission. Known clarifications
  are deterministic and bounded (including explicit freshness tolerances). A coverage
  failure retains the current stage. Wrap-up closes without another design question.
- Planned stage labels travel in `X-Interview-Phase`; the stage indicator and server
  stage state advance only after a completed, nonempty reply. Failed, empty,
  interrupted, or cancelled replies retain the prior stage. Legacy chat requests
  without a session ID keep their existing stateless drawing-aware behavior.
- Temporary sessions live in a bounded process-wide map (500 sessions, two-hour
  inactivity expiry), shared by local route bundles and hot reloads. A missing or
  expired session returns 404; mismatched selections or concurrent turns return 409.
  Browser checkpoints restore expired/lost process state using authenticated encryption.
  This is anonymous prototype recovery; cloud storage, auth, and multi-instance locking
  remain future work. Development logs include the public stage title.
- The drawing invitation is configured per problem. The two-message simple exercise
  and three-message URL-shortener limits remain for legacy stateless chat; session
  stage completion requires confirmed requirements regardless of turn count. The server derives a
  discussion/drawing/explanation/review step from validated history and candidate controls.
  At a completed requirements checkpoint (or the legacy turn limit), the model answers or acknowledges the latest message without
  another question, and the server appends the exact drawing invitation after
  the provider reports completion. That delivered invitation marks the drawing
  step in history. A nonempty sketch does not start review: the candidate keeps
  the floor to draw, pause, and explain across multiple messages. A combined
  Explain my design control changes to Done explaining, which opens discussion;
  during review it becomes Explain an update. Draw / pause questions remains
  separate. Controls send bounded user-message actions (`draw`, `explain`, `review`); explicit natural
  requests such as "I'm still drawing", "Done", or "Let's discuss" also work.
  "Done" starts explanation, and only an explicit discussion request allows
  follow-up questions. These choices persist through ordinary chat messages.
  Canvas edits never switch pacing modes. Plain explanation messages receive a
  deterministic neutral waiting reply; explicit factual questions can still be
  answered. During permitted review, the server probes clear app-to-database path
  gaps and mentioned-but-unlabeled cache/CDN components, while preserving uncertainty
  for freehand/image content. Successful text/image baselines remain independent of pacing. Requirement notes
  and selection rectangles alone do not count as an architecture sketch.
  Handoff, drawing, and explanation replies are buffered until provider completion;
  questions and walkthrough demands are removed before display. Factual answers
  remain; a question-only reply becomes a short acknowledgement. Discussion and
  explicitly invited review keep normal text streaming.
- Scene limits: 500 elements, 1,000 characters per label, and 4,000 characters
  of diagram context. Unsupported visuals and unresolved connections are marked
  explicitly. Raw editor state and individual image files are omitted from chat requests.
- On the first nonempty drawing or a visual change, the browser exports a PNG
  of the whole drawing, including referenced embedded images. It bounds both
  dimensions at 1,280 pixels and the PNG at 1 MB, reducing large exports as needed.
  The server validates the PNG data URL, header, dimensions, and size, then adds
  it as `input_image` beside the latest user's diagram context. No image URLs
  from external hosts are accepted. Empty and unchanged drawings omit the PNG.
- Image changes use a separate fingerprint of positions, styles, drawing order,
  freehand data, background, and embedded image contents. Editor revision and
  retrieval metadata are ignored. Text and PNG use the same isolated send-time
  drawing. Export failures show a notice and continue with text, retaining the
  previous image fingerprint for retry; only a completed, nonempty AI reply
  advances either baseline. Neither historical nor previous PNGs are replayed.
- Diagram changes are capped at 2,000 characters. IDs identify additions,
  removals, renames, rewiring, note edits, and frame changes; layout-only edits
  are ignored. The browser stores an isolated snapshot after each complete,
  nonempty reply. Failed or interrupted replies do not advance that baseline.
- In development, `/api/chat` logs the extracted diagram text under
  `[chat] Current whiteboard diagram` and the diff under `[chat] Whiteboard changes`
  in the dev server terminal. `[chat] Whiteboard image` logs attachment status
  without the PNG data. `[chat] Interview step` logs the current handoff step.
- IndexedDB stores full native drawings (including freehand and referenced images),
  messages, selection, stage/checkpoint, delivery/pacing baselines, ended evidence
  for retries, scorecards, drafts, viewport, end time, and grading failures. Draft
  changes save immediately. Drawing autosaves after 400 ms idle and every 10 s
  while editing; submitted/completed turns save immediately. Refresh reopens the
  active browser save; a valid /interview?session=<UUID> link takes precedence and
  Back/Forward reopens browser saves. Saved interviews is a dialog with score, signal,
  elapsed time, active marker, and explicit delete confirmation. New interview starts
  the current problem/level/duration in one click with a blank board. Change problem
  opens the picker while retaining the displayed selection. Saves are confirmed after transaction commit,
  and revision checks prevent stale tabs overwriting each other. Storage failures
  show a notice; wait for Saved in this browser before refreshing.
- The browser requests NDJSON chat events; the final completion event carries the
  opaque checkpoint after a successful stage commit. The token is accepted only
  after successful EOF. Plain-text API clients retain existing behavior. Resume
  and chat/end can restore server stages from tokens after process loss. Ended
  tokens verify the original frozen evidence hash. Checkpoints derive a key from
  `INTERVIEW_RESUME_SECRET` or `OPENAI_KEY`; keep a stable dedicated secret to
  survive provider-key rotation. No rubric or credentials enter browser tokens.
  Saved scorecards open without a grading request. Clearing site data removes
  browser saves; they do not sync across devices or origins. Auth and
  cloud history remain later increments.
  Vitest maps `server-only` to Next's empty server entrypoint;
  Next enforces the client import boundary during builds.

## Notes

- `AGENTS.md` is generated and rewritten by `next dev`; commit its changes
  alongside your work rather than reverting them.
- `npm audit` reports 5 high findings, all from `braces` inside
  `eslint-config-next`. Dev-only, and the only "fix" downgrades ESLint config to
  v14. Left as is deliberately.

@AGENTS.md

## Interview usability and grading calibration

The workspace reserves most laptop height for the board and chat. Chat scrolls to
the latest message after restoration, sending, and reply updates, and shows a
thinking/replying status. The board restores its saved viewport; older viewportless
boards center on content. Dirty detection ignores editor revisions, selections,
and unused files, while pan/zoom saves quietly. End interview opens a confirmation
dialog and offers inclusion of an unsent answer. Low-time warnings appear at five
minutes (15 seconds in test mode) and in the final minute.

Scorecards show server-derived elapsed and allowed time. Attempts under ten minutes
(of 45), and 1-minute test sessions, have provisional area feedback and no overall
signal. This does not reduce area scores. Grading requires concrete reasoning for
3/4 or 4/4, and server validation caps single-server bottleneck scores at 2 when cited
evidence lacks a diagnostic resource/measurement explanation. Supplied traffic
numbers cannot prove a bottleneck. Gap captions must describe a useful issue rather
than only naming a diagram element. Existing successful scorecards remain unchanged.
