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
2. The session starts. The interviewer explains the problem's scenario, objective, and scope, then asks one requirements clarification question.
3. Candidate asks clarifying questions in chat and draws on the whiteboard.
4. On each candidate message, the app sends the chat and current diagram to the backend. The interviewer answers clarifications, waits during drawing/explanation, or asks at most one follow-up during discussion.
5. The interviewer moves through stages as the candidate covers their criteria and invites discussion.
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
- **End button:** Confirms the decision, optionally includes an unsent answer, then freezes the session and opens the scorecard.

State handling:

- Keep the latest scene in memory. Autosave it to IndexedDB after a drawing pause and every 10 seconds during continuous edits, so a refresh can restore it.
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

The table above is the planned timed interview flow. The current prototype uses
the problem-specific stages below with a single deadline for the whole interview.
Per-stage timed transitions remain deferred; stage changes preserve the candidate's
drawing and explanation pacing and are driven by coverage and candidate permission.

**Problem config (hidden from the candidate)**

Each problem is a JSON file with: the prompt, scale hints to share if asked, rubric areas with what "strong" looks like, and a list of good deep-dive questions. Example rubric areas for a URL shortener: ID generation, read path and caching, storage choice, scaling and sharding, analytics.

Current prototype: the configured problems are "Scale a single server" and
"Design a URL shortener", each with mid, senior, and staff levels. Their JSON
configurations hold the exercise,
product requirements, level-specific openings and expectations, scale hints,
private rubric, and follow-up bank. The browser receives only public problem
summaries, public stage labels, session ID, and selected opening; Next's `server-only` guard protects the
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
The server returns a deterministic assistant opening with an expanded problem
brief: scenario, objective, scope, and one requirements clarification question.
Short paragraphs separate the context and task from the question. Each problem
and difficulty has its own configured brief. The candidate need not send "hello",
and starting does not consume an LLM call. The current selection is displayed as a read-only summary. New interview starts
the same problem, difficulty, and duration in one click with fresh chat, baselines,
and a blank board. Change problem opens the picker with the current selection retained. The prior interview remains in browser history. New interview is disabled while a reply streams.

Each `POST /api/chat` now requires the selected problem ID and level alongside
the messages and diagram. The server validates them, resolves its own config,
and includes the selected level, requirements, and scale facts in trusted
instructions on every model request. During the initial requirements checkpoint,
design expectations, rubric, and follow-up bank are deferred until later stages.
Chat and drawing content remain user data;
the model is instructed to keep the rubric private, stay on the selected problem,
continue from the configured opening, and share requirement/scale facts only
when asked. Invalid or missing selections return 400, and unknown problems return
404 before any provider call. The start endpoint creates a temporary server session
and returns `sessionId` and the initial public `phase` alongside the opening.
Browser-local persistence, resume, and a whole-interview timer are implemented.
Account-based synchronization and database-backed sessions remain planned.

**Current stage tracking**

Each private problem configuration contains an ordered `phases` list. Every entry
defines an ID, public title, goal, completion criteria, interviewer guidance, and
transition policy. Single-server scaling uses five stages: Clarify requirements,
Draw and explain, Discuss improvements, Validate results, and Wrap up. The URL
shortener uses Clarify requirements, Draw and explain, Explore the core design,
Scaling and reliability, and Tradeoffs and wrap-up.

The initial stage establishes shared scope, scale/performance goals, and constraints.
Facts explicitly provided in the configured opening are already established. A
configured clarification answer covers its corresponding setup criterion in the
same completed turn; the candidate need not recite the interviewer's own numbers
or existing-data constraints. Recognized older assistant wording of the configured
single-server scale/latency facts is also shared context. These facts never earn
candidate technical scores. A sketch, turn count, or readiness alone cannot cover
missing requirements. The URL shortener still needs candidate-proposed service goals.

The server answers configured clarification topics directly, including a clear
bounded yes/no freshness answer. Other clarifications use the model with the same
configuration. Only a still-missing requirement can become a setup question.
Drawing/explanation hold questions, even when a requirement remains open. Candidate
statements can cover remaining requirements during an explanation. A strict structured
assessment verifies exact candidate quotes for those remaining and later criteria;
invented/assistant quotes and malformed output cannot advance candidate coverage.
Coverage accumulates across completed turns; stages advance at most once per reply.
The drawing stage requires a live sketch and explicit discussion permission. Failed
assessment keeps the stage, and the final stage closes without another design question.

Stage and pacing are independent. Early drawing/explanation keeps questions paused
while the requirements stage remains active. Requirements confirmed during that
pause can advance the stage without enabling questions. Drawing or explaining within any later stage
holds questions, skips coverage assessment, and preserves the stage and existing
coverage. The candidate can resume discussion without returning to setup.

The UI always submits the started session ID; client stage or coverage claims are
ignored. The response carries planned public labels in `X-Interview-Phase`. The UI
indicator and server stage state advance only after a complete, nonempty reply.
Failed, empty, interrupted, or cancelled replies do not advance stage state. The
server rejects concurrent turns and changed problem/difficulty selections with 409.
Legacy requests without a session ID retain the configured turn-count handoff and
explicit candidate pacing controls.

Sessions are temporary process-local state, shared across local route bundles and
hot reloads, bounded to 500 entries, and expire after two hours of inactivity.
An expired or missing session can be restored from an opaque, authenticated browser
checkpoint. Without a checkpoint it returns 404. Database-backed sessions, ownership
checks, and distributed locking remain planned.

**Browser saves and resume (current)**

The `inteliprep` IndexedDB database stores versioned interview records and an active
session pointer. Each record includes the selected opening/problem/difficulty,
transcript, public stage, native Excalidraw elements/background/referenced files,
semantic and image delivery baselines, pacing capture, unsent draft, native viewport,
ended status/time, grading failure, and scorecard. Draft changes save immediately.
Native drawings retain freehand points, label bindings, styling, and embedded image
bytes; the semantic scene used for model input is intentionally less complete.

Drawing edits autosave after a 400 ms pause and every 10 seconds during continuous
editing. Submitted candidate turns save before the chat request; completed assistant
replies save together with the server checkpoint and delivery baselines. Partial
assistant replies are displayed in memory but never saved as complete replies.
Drawing autosaves retain the latest native canvas without replacing the older
send-time diagram baselines. A save is confirmed only after its IndexedDB transaction
commits. A revision check rejects stale writes from another tab rather than overwriting
newer work; the UI pauses editing and asks the candidate to reopen that browser save.

The browser requests NDJSON chat framing using `Accept: application/x-ndjson`.
Delta events contain text, followed by a completion event with the public stage and
opaque resume token. The server issues that token only after committing a successful
reply. The client accepts the token only after a valid completion event and successful
EOF. Existing API callers retain plain text streaming and the planned-stage header.
No private rubric or stage criteria are included in public responses. The AES-GCM
checkpoint carries encrypted selection, session ID, committed stage/criterion indexes,
and, after ending, the timestamp and hash of the immutable grading evidence.

The token key derives from `INTERVIEW_RESUME_SECRET` when configured, otherwise
`OPENAI_KEY`, with a separate application context. A stable dedicated secret avoids
invalidating resume checkpoints when the provider key rotates. With neither secret
configured, starting still works using a process-local random key, but restarting that
keyless server cannot restore active progress. Restarts with the same secret restore
stages without a new model assessment. Live server state takes precedence over older
tokens. This is anonymous prototype recovery, not account authentication or a
distributed concurrency/revocation system.

Refresh restores drafts and the native viewport as well as messages, mode, timer,
and drawing. A valid `/interview?session=<UUID>` link opens that browser-local save
before considering the active pointer; Back/Forward reopens earlier saves after
any current turn finishes. Links require the same origin and browser profile.
Refresh without a session link automatically reopens the selected browser save. Saved interviews provides
Resume/View and explicit deletion with confirmation. New interview preserves history and starts the displayed selection in one click
with a blank whiteboard. Change problem clears the active pointer and opens the picker,
retaining the current selection. Reopening a stored scorecard
makes no server or grading call. Failed grading retains the exact first end request in
IndexedDB for retry; a restored ended token verifies its evidence hash. Successful
grading releases the stored PNG/end payload while retaining feedback and the native
board. Server cached cards are still temporary; the browser copy is persistent.

Storage errors are visible and leave current work in memory. Wait for “Saved in this
browser” before refreshing. Browser saves are scoped to the site origin and browser
profile; clearing site data or ending a private-browsing session removes them. There
is no cross-device sync, cloud backup, or offline interviewer. Abrupt termination
before an asynchronous save commits can lose the latest unsaved changes.

**Interview timer (current)**

Before starting, the candidate selects 45 minutes (default) or 1 minute (test).
`POST /api/interview/start` accepts optional `durationMinutes` restricted to those
two values. The server creates `timing: { startedAt, deadlineAt, durationMinutes }`
and returns a clock-calibration timestamp (`serverTime`). Client-supplied start
times or deadlines are ignored. The deadline is included in the encrypted resume
checkpoint and stored with the interview in IndexedDB. Every completed chat
checkpoint retains the original deadline.

The visible countdown recomputes the difference between that fixed deadline and
server-aligned wall time. It does not decrement a tick counter, so delayed callbacks,
background tabs, or laptop sleep do not grant fresh time. Refresh/reopen verifies
the original checkpoint and recalibrates against current server time, including
when the deadline has already passed. Browser copies from before timers existed
receive a 45-minute deadline on their first successful reconnect; that new deadline
is saved and preserved thereafter. Already completed scorecards require no migration.

At zero, new chat and pacing actions stop, the whiteboard becomes read-only, and
the browser freezes its native drawing for grading and autosave. The server also
rejects newly submitted turns past the deadline with 409/`INTERVIEW_TIME_EXPIRED`.
A turn accepted before expiry can finish, commit its progress, and save its full
reply. If an unsent draft exists, the browser preserves it and waits for the candidate
to choose Include final answer and score or Score without this answer. The existing
text becomes a final candidate message only when included; an excluded draft remains
available with the saved interview. With no draft the end/grading flow runs once
automatically, using the full transcript and frozen drawing. A five-minute warning
(and a final-minute warning) asks the candidate to finish sending; the 1-minute test
uses a 15-second warning. Automatic ending shares the same session lock,
immutable grading snapshot, and cached result as manual ending. Failed grading
shows Retry scorecard; it does not repeatedly call the provider. A stored scorecard
is never regenerated automatically.

Elapsed time does not advance stages or change rubric weights. Scorecards report
server-derived time used against the scheduled time. Attempts under ten minutes of
a 45-minute session, and 1-minute test sessions, have provisional area feedback and
no overall signal. Unexplored areas remain unassessed. The deadline continues while the page is closed; automatic
grading runs when an unfinished expired save is reopened. Background browser
scheduling can delay the grading request, while server deadline enforcement prevents
extra chat. Clock calibration assumes a stable device clock between connections;
the server always checks its own time before accepting a session turn.

Each problem config contains a drawing invitation and a legacy turn-count policy:
two candidate messages for the simple server exercise and three for the URL shortener.
The opening does not count. Legacy stateless chat retains that limit; started sessions
require the evidence-backed requirements checkpoint and hand off as soon as it is
covered, without unnecessary extra setup questions. The server derives pacing from the
validated history and bounded candidate pacing actions, rather than
accepting an arbitrary client-supplied phase or instructions.
At handoff, the model answers a pending clarification or briefly acknowledges
the candidate without another question; the application then appends the exact
configured invitation after a completed provider response. This ensures that
the drawing prompt is delivered even if the model would otherwise keep probing.
Requirements clarification, handoff, drawing, and explanation replies are buffered until completion; extra
question sentences and walkthrough demands are removed before display while
preserving factual clarification answers. If a waiting reply contains only
questions, the app instead gives a short acknowledgement. Later discussion and
explicitly invited diagram-review replies still stream normally.

The delivered invitation is recognized in assistant history. Drawing on the canvas
never changes pacing by itself; the current mode is displayed separately from the
server-owned stage. A partial canvas never starts review automatically.
The candidate controls **Draw → Explain → Discuss** using chat buttons or explicit
messages. A single contextual design button starts as **Explain my design**, changes
to **Done explaining** to invite questions, and becomes **Explain an update** during
discussion. **Draw / pause questions** remains separate. The candidate can explain
across multiple messages before opening discussion. Candidate messages may carry
only one of three validated actions:
`draw`, `explain`, or `review`; assistant messages cannot carry these actions.
"I'm still drawing" pauses questions, "Done" gives the candidate the floor to
explain, and "Let's discuss" permits review questions. These choices remain active
across ordinary chat messages, so an explanation can span multiple turns.
Drawing and explanation replies answer explicit factual clarifications or briefly
acknowledge the candidate; they do not critique or cross-question the design.
Only an explicit review request starts follow-ups.

Edits during review keep review mode. The candidate explicitly pauses questions
with Draw / pause questions or gives themselves the explanation floor with Explain
an update. “Please let me finish” keeps explanation mode across ordinary messages.
Such explanation messages get a deterministic neutral acknowledgement, without praise
or a recap assuming completion. Explicit factual questions can still be answered.
During review, the server probes a clear missing app-to-database path (including
an unconnected second app) or a cache/CDN the candidate mentioned but has not labeled.
Unresolved arrows, freehand, and image content preserve uncertainty; model prompts
also inspect current paths and avoid generic praise. No probe runs during explanation.
Text/image delivery baselines remain independent of pacing, and neither editor
revision changes nor selections/unused image files mark the drawing content dirty.
Viewport-only changes autosave quietly. Failed or interrupted replies do not advance
baselines or commit a stage. Stateless clients retain the configured turn-count
handoff and explicit pacing controls.

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

**Current prototype**

The candidate can click End interview at any stage after a reply completes. A
confirmation dialog prevents accidental ending and offers to include any unsent
answer. Chat
and drawing are frozen while the current transcript and final whiteboard are
captured. The client exports a fresh bounded PNG for grading even if the last chat
turn omitted an unchanged image; an export failure shows a notice and uses text.
`POST /api/interview/end` validates the started selection/session, transcript,
scene, and PNG, then stores the first end snapshot and marks the interview ended
before grading. Chat and concurrent grading requests are rejected. The snapshot
is fixed across retries; later client evidence cannot replace it. A successful
scorecard is cached and its large grading payload is released. Sessions and cached
feedback retain the prototype's two-hour inactivity expiry and process-local storage.

The separate grader receives the whole supplied transcript, final diagram text and
PNG, selected difficulty, and problem-specific private rubric. It grades quality
across the available evidence without using stage order, stage coverage, or drawing
before clarification as scoring inputs. Level expectations set the technical depth.
Strict JSON output is validated with Zod, including exactly one entry per configured
rubric area and scores from 1 to 4. Each numeric score, strength, and gap requires
an exact candidate quote with its original message index or a real live diagram
element ID. The server prepares bounded candidate excerpts; the grader selects
their quote IDs and the server attaches the original words, avoiding rewritten
or paraphrased citations. Invented references, interviewer quotes, and duplicate/missing areas
reject the result. Invalid output or evidence is retried once. Provider failures
leave the interview ended and show Retry scorecard, using the same snapshot.

Unexplored rubric areas show Not assessed with no numeric score. Any unassessed area
means there is not enough evidence for an overall hire signal. An interview without a technical candidate answer returns unassessed feedback
without a model call, including unexplained drawings and greeting/pacing-only sessions.
The scorecard shows a summary, configured area scores, up to three strengths and
three demonstrated gaps, their evidence, and one configured next practice problem.
The final board is read-only and the transcript remains viewable. New interview
clears the displayed feedback and opens a blank whiteboard. The completed
scorecard remains in browser-local history and can be reopened after refresh.

The grading endpoint accepts up to 102 messages (the last assistant reply after
a full 100-message chat request, plus one confirmed final draft), 8,000 characters per message, and
96,000 transcript characters in total. Oversized input is rejected rather than
silently truncated. Diagram limits are the same as chat. This first increment
supports manual End interview and automatic ending at the saved interview deadline.

**Planned persisted evaluation**

Inputs: full transcript, final diagram (text and PNG), problem rubric, candidate level.

Output (strict JSON):

- Score 1 to 4 per area: requirements, estimation, high-level design, deep dive, tradeoffs, communication.
- Overall hire signal: strong no, no, yes, strong yes.
- Top 3 strengths and top 3 gaps, each tied to a quote or a diagram element.
- One suggested next problem to practice.

Run grading at temperature 0 and validate the JSON with a schema (Zod). Retry once on failure.

## Data model

The current persistence increment uses the browser-local records described above.
The relational model below remains the planned account-based/cloud storage design.

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
`POST /api/interview/start` for a configured opening, and `POST /api/interview/end`
for ending and scorecards, plus `POST /api/interview/resume` to verify/restore an
opaque browser checkpoint and return public stage/ended status. Chat and end requests
accept an optional `resumeToken` for recovery after server process loss. These establish the setup
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

## Usability corrections from full-interview testing

The setup/status bars are compact and Saved interviews opens as a dialog, leaving
the drawing and chat most of the laptop viewport. Chat scrolls to the latest message
after restoration, sending, and streaming, and displays a thinking/replying status.
The board preserves zoom/pan on refresh (older boards without a viewport center on
content). Ended selections are read-only summaries. History rows show signal, average
assessed score, elapsed time, which interview is open, and a visibly active delete
action with confirmation. Grading failures are saved and shown as failures, rather
than only “pending”; retries keep the original evidence.

Technical grading uses conservative anchors: 3 requires a concrete choice or
diagnosis with reasoning, while 4 additionally needs validation and tradeoff analysis.
Repeated interviewer numbers cannot establish bottleneck diagnosis. Server calibration
caps the single-server bottleneck area at 2 when its cited evidence contains no
diagnostic resource or measurement explanation, and removes a positive overall
signal based on that inflated assessment. Gap text must identify a useful issue,
its consequence, and an improvement; an evidence label alone is rejected. Diagram
references are displayed separately. Completed legacy scorecards are retained,
while future grading/retries use the current rules.
