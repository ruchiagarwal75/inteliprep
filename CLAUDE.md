# InteliPrep

AI system design interviewer. An AI runs a 45 minute system design interview over
text chat while watching the candidate's Excalidraw whiteboard, then produces a
scorecard against a rubric.

**Read [docs/spec.md](docs/spec.md) before big changes.** It is the source of
truth for architecture, the interviewer engine, phases, the data model, and the
API surface. If a change contradicts the spec, update the spec in the same PR.

Status: early prototype with diagram-aware streaming chat, an Excalidraw
whiteboard, diagram change detection, PNG image input, and server-owned stage
tracking. Timers and durable persistence come later. Candidates can start single-server scaling or the URL
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
  and unlocks chat. New interview resets chat and both diagram baselines while
  preserving the whiteboard. Setup changes are disabled during an active interview.
- Configurations live in `src/lib/problems/single-server-scaling.json` and
  `src/lib/problems/url-shortener.json`. The simple scaling exercise starts with
  one machine running a website and its data, and uses short, approachable
  follow-ups about measurement, request flow, and validating improvements.
  `problems.ts` and `interview-instructions.ts` use Next's `server-only` guard.
  Only problem ID, title, summary, and supported levels reach the browser catalog;
  the rubric, scale hints, requirements, and follow-up bank remain on the server.
- `GET /api/problems` — returns the public catalog. The server-rendered interview
  page uses the same projection, without sending private config in page props.
- `POST /api/interview/start` — validates `{ problemId, level }`, creates a temporary
  server session, and returns its ID, initial public stage, selected IDs, and one
  configured assistant opening. It makes no LLM call.
- `POST /api/chat` — validates `{ problemId, level, sessionId?, messages, scene?, previousScene?, diagramImage? }`, streams the
  reply back as plain text. The server extracts a shared semantic graph for each
  scene and passes the current description and the change summary as user data
  to the interviewer. The later session route uses SSE instead (see spec "API design").
- Every chat turn resolves the problem on the server and attaches the selected
  level, requirements, scale assumptions, rubric, and follow-up bank in trusted
  instructions. Client-supplied rubric or instruction fields are ignored. Missing
  selections and invalid levels return 400; unknown problem IDs return 404.
- Each problem has five ordered stages in its private `phases` configuration:
  ID, public title, goal, completion criteria, interviewer guidance, and transition
  policy. Single-server scaling uses Understand the bottleneck → Draw and explain
  → Discuss improvements → Validate results → Wrap up. The URL shortener uses
  Clarify requirements → Draw and explain → Explore the core design → Scaling and
  reliability → Tradeoffs and wrap-up.
- The workspace always sends the started session ID. The server locks a session
  while replying and owns its stage and accumulated criterion coverage; arbitrary
  client phase/coverage fields are ignored. Initial discussion moves to drawing at
  the existing handoff or an early sketch/pacing request. Drawing moves to discussion
  only with a live sketch and explicit candidate permission. Later stages use a
  separate strict-JSON coverage check with exact candidate quotes; invalid evidence
  or assessment failures keep the stage. Stages advance at most one step per turn.
  Drawing/explanation pauses preserve the stage and hold questions without running
  the coverage checker. Wrap-up replies close without another design question.
- Planned stage labels travel in `X-Interview-Phase`; the stage indicator and server
  stage state advance only after a completed, nonempty reply. Failed, empty,
  interrupted, or cancelled replies retain the prior stage. Legacy chat requests
  without a session ID keep their existing stateless drawing-aware behavior.
- Temporary sessions live in a bounded process-wide map (500 sessions, two-hour
  inactivity expiry), shared by local route bundles and hot reloads. A missing or
  expired session returns 404; mismatched selections or concurrent turns return 409.
  This is local prototype state; durable storage, auth, and multi-instance deployment
  support remain future work. Development logs include the public stage title.
- Drawing handoff is configured per problem: two candidate messages for the
  simple server exercise, three for the URL shortener. The server derives a
  discussion/drawing/explanation/review step from validated history and live canvas content.
  At the limit, the model answers or acknowledges the latest message without
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
  Editing during review records a `draw` action on the next submitted turn unless
  the candidate explicitly chooses explanation or discussion. Pacing captures
  are independent of successful text/image delivery baselines. Requirement notes
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
- No persistence: messages and the whiteboard scene vanish on refresh.
- Selection is also in memory. The full timed phase engine, resume, timers, and
  scorecards remain later increments; the temporary server session is not persisted.
  Vitest maps `server-only` to Next's empty server entrypoint;
  Next enforces the client import boundary during builds.

## Notes

- `AGENTS.md` is generated and rewritten by `next dev`; commit its changes
  alongside your work rather than reverting them.
- `npm audit` reports 5 high findings, all from `braces` inside
  `eslint-config-next`. Dev-only, and the only "fix" downgrades ESLint config to
  v14. Left as is deliberately.

@AGENTS.md
