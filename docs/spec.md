# AI System Design Interviewer: Phase 1 Tech Spec

Oct 2, 2026 · @Ruchi Agarwal

## Overview and goals

Phase 1 ships a web app where an AI interviewer runs a 45 minute system design interview over text chat while watching the candidate's whiteboard. Voice and video come later and reuse this same interviewer engine.

Goals:

- The interviewer asks follow-up questions that reference what is on the whiteboard.
- The interviewer moves through realistic phases and never hands out the answer.
- The candidate gets a scorecard against a clear rubric at the end.

Success metrics for launch:

- 80% of test users rate the follow-up questions as "relevant to my diagram".
- Median AI reply time under 4 seconds.
- Cost per full interview under a set budget (see Open questions).

## Scope

| In scope (Phase 1)                           | Out of scope (later phases)                          |
| -------------------------------------------- | ---------------------------------------------------- |
| Text chat with the AI interviewer            | Voice conversation                                   |
| Embedded Excalidraw whiteboard               | Video avatar                                         |
| AI reads the diagram as text and as an image | Live cursor tracking or real-time drawing commentary |
| 5 to 10 curated problems with rubrics        | User-created problems                                |
| Phase tracking and a 45 minute timer         | Multi-interviewer panels                             |
| End-of-interview scorecard                   | Peer or human review                                 |
| Email sign-in and session history            | Payments and team plans                              |

## User flow

1. Candidate signs in and picks a problem (for example, "Design a URL shortener") and a level (mid, senior, staff).
2. The session starts. The interviewer greets them and states the problem in one or two lines.
3. Candidate asks clarifying questions in chat and draws on the whiteboard.
4. On each candidate message, the app sends the chat and the current diagram to the backend. The interviewer replies with one follow-up.
5. The interviewer moves through phases as the candidate covers each one or as time runs out.
6. At 45 minutes (or when the candidate clicks End), the interviewer wraps up.
7. The app shows a scorecard with scores per area, strengths, gaps, and the final diagram.

## Architecture

One Next.js app serves the UI and the API. The API holds all interviewer logic so prompts and rubrics never reach the browser.

&#91;embedded content: Phase 1 architecture · request flow per turn\]

The browser never talks to the LLM directly. The API passes each turn to the interviewer engine, which builds the prompt and streams the reply back.

| Layer        | Choice                                    | Why                                              |
| ------------ | ----------------------------------------- | ------------------------------------------------ |
| Frontend     | Next.js (React, TypeScript)               | One codebase for UI and API routes               |
| Whiteboard   | `@excalidraw/excalidraw` React component  | Free (MIT), exports scene JSON and PNG           |
| Backend      | Next.js API routes (Node)                 | Simple to start; split out later if needed       |
| LLM          | Claude or GPT via official SDK, streaming | Strong reasoning, image input, streaming replies |
| Database     | Postgres (Supabase or Neon)               | Sessions, messages, snapshots, scores            |
| File storage | S3 or Supabase Storage                    | Diagram PNGs                                     |
| Auth         | Clerk or Supabase Auth                    | Email and Google sign-in                         |
| Hosting      | Vercel                                    | Easy deploys, streaming support                  |

## Frontend

The interview screen is a split view: whiteboard on the left (about 65% width), chat on the right. A top bar shows the problem, the current phase, and the timer.

Components:

- **Whiteboard:** Excalidraw with `onChange` wired to local state. Load it client-side only (`dynamic(..., { ssr: false })`).
- **Chat panel:** Message list plus input. Renders the AI reply as it streams in.
- **Phase indicator:** Shows the current phase, set by the server.
- **Timer:** Counts down from 45 minutes. Server time is the source of truth so a refresh does not reset it.
- **End button:** Ends the session early and opens the scorecard.

State handling:

- Keep the latest scene in memory. Autosave it to the server every 10 seconds if it changed, so a refresh does not lose work.
- On send, attach the current scene JSON and a PNG export to the message request.
- Disable the send button while the AI is replying to keep turns in order.

## Diagram understanding

The AI gets the diagram in three forms on every turn: a text graph (main signal), a diff since the last turn, and a PNG (backup for layout and anything the text misses).

**1. Scene to text.** Excalidraw elements are converted on the server into a list of components, connections, and notes. LLMs reason about this far better than about pixels.

```typescript
function sceneToText(elements: any[]): string {
  const live = elements.filter((e) => !e.isDeleted);
  const byId = Object.fromEntries(live.map((e) => [e.id, e]));
  const label = (id: string) =>
    live.find((t) => t.type === "text" && t.containerId === id)?.text ??
    byId[id]?.type;

  const boxes = live
    .filter((e) => ["rectangle", "ellipse", "diamond"].includes(e.type))
    .map((e) => `- ${label(e.id)}`);

  const arrows = live
    .filter((e) => e.type === "arrow" && e.startBinding && e.endBinding)
    .map(
      (e) =>
        `- ${label(e.startBinding.elementId)} -> ${label(e.endBinding.elementId)}` +
        (label(e.id) !== "arrow" ? ` (${label(e.id)})` : ""),
    );

  const notes = live
    .filter((e) => e.type === "text" && !e.containerId)
    .map((e) => `- note: ${e.text}`);

  return [
    "Components:",
    ...boxes,
    "",
    "Connections:",
    ...arrows,
    "",
    "Notes:",
    ...notes,
  ].join("\n");
}
```

**2. Diff.** Compare the new component and connection lists with the last snapshot. Output "added", "removed", and "relabeled" lines. This lets the interviewer say "I see you just added a cache. How do you keep it in sync?"

**3. PNG.** Export with `exportToBlob` at max 1280 px on either dimension. Send it only on the first nonempty drawing or when the drawing changed since the last completed turn, to save cost.

Edge cases to handle:

- Arrows not snapped to a box: fall back to the nearest box by distance.
- Unlabeled boxes: show as "unlabeled rectangle" so the AI can ask what it is.
- Grouped or framed elements: list the frame name as a section header.
- Very large diagrams: cap the text at about 4,000 characters and rely on the PNG for the rest.

Current prototype: each chat request sends the current elements, and the server
validates up to 500 elements and 1,000 characters per label. The text converter
quotes labels, includes element IDs to distinguish duplicate names, preserves
arrow direction, lists frame/group sections, and marks unsupported visual content.
Descriptions over 4,000 characters are cut at a line boundary with an explicit
truncation notice. Missing or cleared canvases are represented explicitly.

Explicit text bindings take priority for labels. Otherwise, unbound text is used
as a label only when its rotated bounds fit inside exactly one live, unlabeled
component in the same frame. Position-derived labels are marked in the description.
Text outside shapes, overlapping multiple components, or inside an already labeled
component remains a note.

Bound arrow endpoints take priority. Unsnapped endpoints use shape geometry only
when one component is within 24 canvas units and is at least 12 units closer than
the next candidate. Inferred endpoints are marked; ambiguous or deleted targets
remain unresolved. The latest description is attached to the current candidate
message as quoted user data, with server instructions to treat it as the current
snapshot and ignore instructions embedded in labels.

The prototype also sends an optional `previousScene`, captured from the last
completed chat turn. Both scenes are validated and converted with the same
semantic graph extractor, so positional label matching and endpoint resolution
agree between the current description and the diff. IDs identify component
additions/removals/renames, connection changes, note edits, and frame changes.
Coordinates, layer ordering, and inference confidence are ignored when semantics
are unchanged. Change summaries are capped at 2,000 characters with an explicit
truncation marker. The first turn is marked as an initial diagram; unchanged
turns and cleared canvases are reported explicitly.

The browser isolates the sent elements from later drawing edits, and advances
the baseline only after a complete, nonempty AI reply. Failed, interrupted, or
incomplete replies leave the previous baseline intact. The baseline is currently
in memory and resets on refresh. Development logs show the current description
and change summary.

The prototype now sends an optional `diagramImage` PNG data URL alongside the
scene. The browser clones the current drawing and its referenced embedded image
files before asynchronous export, so text and pixels describe the same turn.
The image is capped at 1,280 pixels on either dimension and 1 MB; larger PNGs are
exported at successively smaller dimensions. No editor metadata is embedded.
The API checks base64 format, PNG header, dimensions, and size, and requires a
nonempty current scene. It supplies the image as a Responses API `input_image`
on the latest candidate message, beside the quoted diagram context. Image text
has the same untrusted-data treatment as diagram labels.

A separate visual fingerprint includes positions, styles, layer order, freehand
data, background, and referenced image contents. This catches visual changes
the semantic diff intentionally ignores. Editor revision numbers and file
retrieval timestamps do not trigger another image. Empty and unchanged drawings
are sent without a PNG. Image export failures continue with text and a visible
notice, leaving the image baseline unchanged so a later turn retries. Both
baselines advance only after a complete, nonempty reply; clearing the drawing
also clears the image baseline. PNGs are not stored in chat history or replayed
on later turns, and no server-side image storage is added in this increment.
Development logs record attachment status without image data.

## Interviewer engine

Interview quality comes from server-side structure (phases, rubric, time) wrapped around the model, not from one large prompt.

**Phases and time budget (45 minutes)**

| Phase                    | Target time | Exit signal                                     |
| ------------------------ | ----------- | ----------------------------------------------- |
| 1. Requirements          | 5 min       | Functional and non-functional needs stated      |
| 2. Estimates             | 5 min       | Rough QPS, storage, read/write ratio            |
| 3. API and data model    | 5 min       | Core endpoints and main entities                |
| 4. High-level design     | 10 min      | Diagram has the main components connected       |
| 5. Deep dive             | 12 min      | Two rubric areas explored in depth              |
| 6. Tradeoffs and wrap-up | 8 min       | Bottlenecks, failure modes, candidate questions |

The server stores the current phase. After each AI reply, a small classifier call (or a JSON field in the same reply) says whether the phase is done. The server also forces a move when a phase runs 50% over its time.

**Problem config (hidden from the candidate)**

Each problem is a JSON file with: the prompt, scale hints to share if asked, rubric areas with what "strong" looks like, and a list of good deep-dive questions. Example rubric areas for a URL shortener: ID generation, read path and caching, storage choice, scaling and sharding, analytics.

Current prototype: the configured problems are "Scale a single server" and
"Design a URL shortener", each with mid, senior, and staff levels. Their JSON
configurations hold the exercise,
product requirements, level-specific openings and expectations, scale hints,
private rubric, and follow-up bank. The browser receives only public problem
summaries and the selected opening; Next's `server-only` guard protects the
configuration modules from client imports.

The default selection is "Scale a single server" at Mid-level, a simple exercise
for testing the interview and whiteboard flow. A website's application and data
start on one machine; traffic grows and the candidate measures the bottleneck,
proposes an improvement, explains the updated drawing, and checks the result.
Follow-ups use plain language and one question at a time. All difficulty levels
keep this exercise in one region; the higher levels probe validation and failure
tradeoffs rather than introducing a different product or global architecture.

The interview page starts with a problem/difficulty picker and disabled chat.
Start interview calls `POST /api/interview/start` with `{ problemId, level }`.
The server returns a deterministic assistant opening, so the candidate need not
send "hello" and starting does not consume an LLM call. The selection is fixed
in the UI until New interview resets chat and its text/image baselines; the
existing whiteboard is retained. New interview is disabled while a reply streams.

Each `POST /api/chat` now requires the selected problem ID and level alongside
the messages and diagram. The server validates them, resolves its own config,
and includes the selected difficulty expectations and private rubric in trusted
instructions on every model request. Chat and drawing content remain user data;
the model is instructed to keep the rubric private, stay on the selected problem,
continue from the configured opening, and share requirement/scale facts only
when asked. Invalid or missing selections return 400, and unknown problems return
404 before any provider call. The start endpoint is a stateless prototype route;
persisted sessions, full timed phase tracking, timers, and scoring are still planned.

The prototype now has a bounded transition from discussion to drawing. Each
problem config contains a drawing policy: the simple server exercise allows two
candidate messages before the drawing invitation, and the URL shortener allows
three. The opening message does not count. The server derives the step from the
validated history, bounded candidate pacing actions, and canvas, rather than
accepting an arbitrary client-supplied phase or instructions.
At the limit, the model answers a pending clarification or briefly acknowledges
the candidate without another question; the application then appends the exact
configured invitation after a completed provider response. This ensures that
the drawing prompt is delivered even if the model would otherwise keep probing.
Handoff, drawing, and explanation replies are buffered until completion; extra
question sentences and walkthrough demands are removed before display while
preserving factual clarification answers. If a waiting reply contains only
questions, the app instead gives a short acknowledgement. Discussion and
explicitly invited diagram-review replies still stream normally.

The delivered invitation is recognized in assistant history. A live shape,
connection, freehand stroke, or image puts the interview into drawing mode, even
before the turn limit; a partial canvas never starts review automatically.
The candidate controls **Draw → Explain → Discuss** using chat buttons or explicit
messages. Candidate messages may carry only one of three validated actions:
`draw`, `explain`, or `review`; assistant messages cannot carry these actions.
"I'm still drawing" pauses questions, "Done" gives the candidate the floor to
explain, and "Let's discuss" permits review questions. These choices remain active
across ordinary chat messages, so an explanation can span multiple turns.
Drawing and explanation replies answer explicit factual clarifications or briefly
acknowledge the candidate; they do not critique or cross-question the design.
Only an explicit review request starts follow-ups.

If the candidate edits while in review, the next submitted turn records a `draw`
action, unless they explicitly choose explanation or discussion for that turn.
The browser compares captured visual fingerprints, with normalized scene fallback;
this pacing capture does not advance the completed text/image delivery baselines.
The server also detects normalized scene edits during review. Deleted elements,
selection rectangles, and text-only requirement notes do not count as a sketch.
Clearing a sketch leaves time to redraw rather than restarting setup. Failed,
incomplete, or silently truncated provider streams do not append the invitation.
This pacing flow is not yet the full timed six-phase engine described above.

**System prompt rules**

- You are a senior engineer running a system design interview. Be friendly and direct.
- Ask at most one question per reply. Drawing invitations and waiting acknowledgements need no question. Keep replies under 80 words.
- Never give the answer or name the missing component. Ask questions that lead the candidate to find it.
- Refer to the diagram by name ("your API gateway", "the arrow to Redis").
- Push on vague claims: ask why, ask for numbers, ask what breaks.
- Stay in the current phase unless told to move.

**Per-turn flow**

1. Save the candidate message and the scene snapshot.
2. Build text graph, diff, and PNG (if changed).
3. Load problem config, current phase, time left, and rubric coverage so far.
4. Build the prompt: system rules, problem and rubric, phase and time, last 20 messages plus a running summary of older ones, diagram text, diff, PNG.
5. Stream the reply to the browser.
6. Ask the model for a small JSON sidecar: `{ phase_done, rubric_areas_touched }`. Update session state.
7. Save the reply.

To keep context small, a summary of older messages is regenerated every 10 turns.

## Evaluation and scorecard

The scorecard comes from a separate grading call after the session ends, so grading never leaks into the live interview.

Inputs: full transcript, final diagram (text and PNG), problem rubric, candidate level.

Output (strict JSON):

- Score 1 to 4 per area: requirements, estimation, high-level design, deep dive, tradeoffs, communication.
- Overall hire signal: strong no, no, yes, strong yes.
- Top 3 strengths and top 3 gaps, each tied to a quote or a diagram element.
- One suggested next problem to practice.

Run grading at temperature 0 and validate the JSON with a schema (Zod). Retry once on failure.

## Data model

| Table             | Key fields                                                                    | Notes                              |
| ----------------- | ----------------------------------------------------------------------------- | ---------------------------------- |
| `users`           | id, email, name, created\_at                                                  | From auth provider                 |
| `problems`        | id, slug, title, level, config\_json                                          | Rubric lives in config\_json       |
| `sessions`        | id, user\_id, problem\_id, status, phase, started\_at, ended\_at, summary     | status: active, ended              |
| `messages`        | id, session\_id, role, content, phase, created\_at                            | role: interviewer, candidate       |
| `snapshots`       | id, session\_id, message\_id, scene\_json, scene\_text, png\_url, created\_at | One per turn plus autosaves        |
| `scorecards`      | id, session\_id, scores\_json, signal, created\_at                            | One per session                    |
| `rubric_coverage` | session\_id, area, status                                                     | status: not touched, touched, deep |

## API design

The prototype also exposes `GET /api/problems` for public problem summaries and
`POST /api/interview/start` for a configured opening. These establish the setup
flow before the persisted `/api/sessions` lifecycle below is implemented.

| Method and path                   | Purpose                 | Body or response                                                     |
| --------------------------------- | ----------------------- | -------------------------------------------------------------------- |
| `GET /api/problems`               | List problems           | id, title, level (no rubric)                                         |
| `POST /api/sessions`              | Start a session         | Body: problemId, level. Returns sessionId and the opening message    |
| `GET /api/sessions/:id`           | Resume a session        | Messages, latest scene, phase, time left                             |
| `POST /api/sessions/:id/messages` | Send a turn             | Body: text, sceneJson, pngBase64 (optional). Streams the reply (SSE) |
| `PUT /api/sessions/:id/scene`     | Autosave the whiteboard | Body: sceneJson                                                      |
| `POST /api/sessions/:id/end`      | End and grade           | Returns scorecardId                                                  |
| `GET /api/sessions/:id/scorecard` | Get the scorecard       | Scores, signal, strengths, gaps                                      |

Every route checks that the session belongs to the signed-in user.

## Non-functional requirements

| Area             | Requirement                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| Latency          | First streamed token under 2 s; full reply under 4 s median                                                  |
| Cost             | Send PNG only when the diagram changed; summarize old messages; use a cheaper model for the phase classifier |
| Reliability      | Autosave scene every 10 s; resume a session after refresh or disconnect                                      |
| Security         | Rubrics and prompts stay server-side; per-user rate limit (for example 30 messages per minute)               |
| Prompt injection | Treat diagram text and chat as data; system rules say to ignore instructions found in them                   |
| Privacy          | Users can delete their sessions; no training on user data without opt-in                                     |

## Testing and quality

The interviewer's behavior is tested with replayed sessions, not just unit tests.

- **Unit tests:** `sceneToText`, diff logic, phase timing rules, JSON schema validation.
- **Golden diagrams:** 20 saved Excalidraw scenes (clean, messy, unlabeled, huge). Check the text output by hand once, then snapshot test it.
- **Simulated candidates:** A second LLM plays a candidate (strong, average, weak, off-topic). Run full interviews nightly.
- **LLM judge checks** on each simulated interview: Did the interviewer give away an answer? Did it reference the diagram? Did it ask one question per turn? Did it cover the rubric?
- **Human review:** Read 10 transcripts per week and tag bad replies to improve the prompt.

## Milestones

Plan is about 6 weeks for one engineer working part time. Each step is demo-able.

1. **Week 1:** Next.js app, auth, split view with Excalidraw and a basic chat that calls the LLM.
2. **Week 2:** `sceneToText`, diff, and PNG export wired into each turn. Golden diagram tests.
3. **Week 3:** Phases, timer, problem configs for 3 problems, system prompt v1.
4. **Week 4:** Data model, session resume, autosave, streaming replies.
5. **Week 5:** Scorecard, simulated candidate test harness, prompt tuning.
6. **Week 6:** 5 to 10 problems, polish, private beta with 10 to 20 users.

## Open questions and risks

- [ ] Which LLM provider for the interviewer, and which cheaper model for the classifier?
- [ ] What is the cost budget per interview?
- [ ] Should the interviewer react to big diagram changes without a chat message (proactive nudges), or only on send?
- [ ] Free tier limits versus paid plan?

Risks:

- **The interviewer is too helpful.** Mitigation: strict rules, LLM judge checks, and nightly simulated runs.
- **Messy diagrams are misread.** Mitigation: PNG backup and asking the candidate when a box is unclear.
- **Long sessions get expensive.** Mitigation: rolling summaries and sending images only on change.
