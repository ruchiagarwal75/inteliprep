# AI System Design Interviewer: Phase 1 Tech Spec

The new Play beta and its boundary with the existing Mock engine are specified in
[Play beta design](play-design.md). The interview behavior below remains the Mock
mode; its rubrics, weights and whiteboard are unchanged by Play.

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
| Auth         | Supabase Auth                             | Google sign-in first; email remains future work   |
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

Current prototype: the configured problems are "Scale a single server",
"Design a URL shortener", "Design a rate limiter", "Design a chat service",
"Design a news feed", "Design a notification system", "Design a file storage service",
and "Design a video streaming service", each with mid, senior, and staff levels. Their JSON
configurations hold the exercise,
product requirements, level-specific openings and expectations, scale hints,
private rubric, and follow-up bank. The browser receives only public problem
summaries, public stage labels, session ID, and selected opening; Next's `server-only` guard protects the
configuration modules from client imports.

The added exercises cover per-key admission correctness, private one-to-one
messaging and reconnect history, chronological following-based feeds, transactional
notification dispatch, resumable file storage and sharing, and on-demand video
processing and playback. Each
has its own service goals, bounded consistency/freshness answers, private rubric,
and five-stage sequence. These exercises keep a single-region core; higher difficulty
deepens concurrency, recovery, load skew, and operational reasoning. The catalog
and synthetic review fixtures are documented in `docs/problem-catalog.md`.
Real-model evaluation and a complete human-reviewed interview remain release
checks; mocked integration tests alone do not certify interviewer quality.

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
and starting does not consume an LLM call. The current selection is displayed as a read-only summary.
In local development, the workspace prepares the start route with a background
OPTIONS request, which Next handles without creating a session or consuming start
quota. This moves first-use route compilation before the start click; production
does not send this preparation request.
Replacing an ended interview flushes outstanding saves but keeps its workspace
until the new start response is validated. The browser then installs the opening
and one fresh board together, without an intermediate empty workspace. A failed
start leaves the old interview visible. Each committed autosave updates its cached
history summary rather than rereading every transcript and native drawing.
Development console event `[interview] Start timing` reports preparation, request,
save, and total milliseconds without candidate content.
New 45-minute interview retains the problem and difficulty and always uses the regular
45-minute duration, with fresh chat, baselines, and a blank board. Leaving an active
session with New interview or Change problem first offers end-and-score confirmation,
including the existing choice about an unsent answer. Cancellation keeps the session.
The old session's ended state and evidence save before switching; a failed scorecard
retains its retry payload in history. An unconfirmed ending keeps the current view.
Completed sessions can switch immediately. Change problem opens the picker with the
current selection retained. New interview is disabled while a reply streams.

Each `POST /api/chat` requires the selected problem ID and level, a session ID and
valid owner-bound resume token, one new candidate `message`, a stable UUID `turnId`,
and `afterMessageCount`, alongside the diagram. Browser-supplied `messages` histories
and assistant/system submissions are rejected. The server validates them, resolves its own config,
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
The next setup question is selected after inspecting the completed reply for shared
configured facts, so facts supplied in that reply are not immediately asked again.
The completion event includes the resulting stage and checkpoint together.

The server answers configured clarification topics directly, including a clear
bounded yes/no freshness answer. Other clarifications use the model with the same
configuration. Only a still-missing requirement can become a setup question.
Configured answers are topic-specific. Each separately asked clarification part
must match before a canned reply can be used; a partially matched multi-part
request goes to the model with its requested parts listed explicitly as untrusted
input. Missing targets are identified as unspecified. Notification channel-mix,
simultaneous file replacement, and video rebuffering clarifications have explicit
exercise facts; rebuffering has no fixed numeric target.
Drawing/explanation hold questions, even when a requirement remains open. Candidate
statements can cover remaining requirements during an explanation. A strict structured
assessment verifies exact candidate quotes for those remaining and later criteria;
invented/assistant quotes and malformed output cannot advance candidate coverage.
Stage assessment and grading share candidate-excerpt filtering: greetings, bare
acknowledgements, generated controls, and recognized pacing-only sentences cannot
count as evidence. Real explanations accompanying a typed pacing request remain
eligible, including messages with drawing/explanation actions. Stage checks use
the last 12 eligible messages, bounded to the first 2,000 characters per original
message, and skip the model when none remain. Quotes must match within one eligible
excerpt at its original message index; excluded text and joins across excerpts
are rejected. Initial-stage conversation context can clarify references but is
not itself eligible candidate evidence.
Explicit requirement proposals, including retention changes stated without a
question mark, require a visible reply. They bypass quiet-listening acknowledgements
and automatic diagram probes. The interviewer accepts a reasonable allowed value,
explains a fixed-constraint conflict, or requests justification when discussion permits
questions. During drawing/explanation it acknowledges an allowed assumption with
its value and leaves questions paused. Ordinary design narration remains quiet.
Coverage accumulates across completed turns; stages advance at most once per reply.
The drawing stage requires a live sketch and explicit discussion permission. Failed
assessment keeps the stage, and the final stage closes without another design question.
On entering a coverage stage, the server seeds its criteria from earlier eligible
candidate explanations without advancing a second stage. Review replies use plain
text and one question. Before display, a separate structured check compares a
draft question with exact candidate quotes, the previous interviewer question, and
the latest candidate reply; a rewrite is checked again, with a maximum of three
checks. Verified repeats and unrelated topic jumps are replaced before display.
If rewrites still repeat, the interviewer selects a specific unasked question from
the problem's private probe bank, preferring the candidate's named topic or current
answer thread, then an unexplored rubric area. Previously asked probes are excluded
using assistant history, including after refresh. Choosing a topic never triggers
another generic invitation to choose a topic. Technical replies receive a short
acknowledgement grounded in the latest candidate answer; pacing controls do not.
This check adds provider latency to design-discussion replies.
Stage assessments have a 10-second timeout and each question check a 12-second
timeout to bound the route's total work.

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
The internal stateless progress helper retains its configured turn-count policy;
the public chat endpoint requires a started session and verified transcript.

Local development without Redis retains a process-local fallback shared across route
bundles and hot reloads, bounded to 500 entries, with two-hour inactivity expiry.
An expired or missing local session's progress can be restored from an opaque,
authenticated browser checkpoint, but that token cannot recreate a trusted transcript.
Without a checkpoint it returns 404 locally. Vercel/private
beta mode uses an isolated working copy for each request and never reads or writes
the development process cache. The scope lasts through asynchronous streaming;
publication of a new session and release of a shared lease discard that request's
working copy. Beta requests require a valid checkpoint and load authoritative
progress, verified transcripts, frozen end hashes and cached scorecards from Redis under an owner-fenced
distributed lock.
The full native drawing and browser history stay in account-specific IndexedDB.
The active verified transcript is also stored server-side, without PNGs, with a
two-hour inactivity TTL. Chat and resume fail closed with a permanent recovery code
when this transcript is missing, including older active sessions; the candidate can
close without scoring and start again. Candidate
identity uses Supabase Auth; durable cloud interview history remains planned. See the deployment safeguards below.

**Browser saves and resume (current)**

The `inteliprep:account:<userId>` IndexedDB database stores each account’s versioned
interview records and active session pointer. The legacy anonymous `inteliprep`
database is retained separately and is never automatically claimed by a signed-in user. Each record includes the selected opening/problem/difficulty,
transcript, public stage, native Excalidraw elements/background/referenced files,
semantic and image delivery baselines, pacing capture, unsent draft, native viewport,
ended status/time, grading failure, and scorecard. Draft changes save immediately.
Native drawings retain freehand points, label bindings, styling, and embedded image
bytes; the semantic scene used for model input is intentionally less complete.

Drawing edits autosave after a 400 ms pause and every 10 seconds during continuous
editing. Submitted candidate turns save before the chat request; completed assistant
replies save together with the server checkpoint and delivery baselines. Partial
assistant replies are displayed in memory but never saved as complete replies.
Each submitted turn also saves an optional pending-reply reference before model
work. Failed or interrupted turns keep the original candidate message, native
drawing, separate composer draft, and last completed stage/checkpoint. An error
notice outside the scrolling transcript offers Retry reply; it reuses the same
candidate turn and stable turn ID without appending it again. The server checks the
expected message count and candidate-message hash; an already committed matching turn returns
the saved reply without new stage or provider work. Replays preserve earlier whiteboard
delivery baselines so intervening edits are delivered on the next new turn. New sends and pacing controls wait
until that reply completes. Pending status survives reload, including recovery
of older unanswered discussion turns; completed quiet drawing/explanation
checkpoints are not mistaken for failed replies. Successful completion clears
pending state and advances the scene/image baselines. Ending can still assess
the retained candidate answer, with the existing frozen-evidence retry behavior.
Draft input, restored drafts, and save updates are bounded to 8,000 characters before
browser persistence. The composer displays a length hint at the limit and storage
validation failures show readable messages instead of raw validation JSON.
Drawing autosaves retain the latest native canvas without replacing the older
send-time diagram baselines. A save is confirmed only after its IndexedDB transaction
commits. A revision check rejects stale writes from another tab rather than overwriting
newer work; the UI pauses editing and asks the candidate to reopen that browser save.
The editor's first restored/migrated native snapshot becomes the saved baseline,
without reporting an edit. Pending autosaves show Saving, then Saved in this browser.

The browser requests NDJSON chat framing using `Accept: application/x-ndjson`.
Delta events contain text, followed by a completion event with the public stage and
opaque resume token. The server issues that token only after committing a successful
reply. The client accepts the token only after a valid completion event and successful
EOF. Existing API callers retain plain text streaming and the planned-stage header.
Resume responses include verified messages and an available cached scorecard.
Opening an active save reconciles chat from that response. A 409 with
`INTERVIEW_TRANSCRIPT_CHANGED` offers Load latest version for chat and ending;
an IndexedDB revision conflict offers the same recovery. The client rereads the
stored revision before saving, preserves this tab's native drawing and draft,
and keeps unmatched candidate text separately as recovered unsent messages.
The recovered section opens by default and offers Copy per message, with status
feedback and a selection fallback if the clipboard is unavailable. Copying does not
overwrite the message-box draft.
These recovered messages are not grading evidence until sent or explicitly included
as a final answer. Successful reconciliation clears pending retries and stale
delivery baselines, and remounts chat with the new persisted revision. A locally
marked ending is cleared when verified server messages show the interview is active.
Ongoing drawing/explanation acknowledgements carry `replyKind: "listening"`; the
browser commits their checkpoint without displaying or saving an assistant bubble.
No private rubric or stage criteria are included in public responses. The AES-GCM
checkpoint carries encrypted selection, session ID, authenticated owner ID, committed stage/criterion indexes,
and, after ending, the timestamp and hash of the immutable grading evidence.

The token key derives from `INTERVIEW_RESUME_SECRET` when configured, otherwise
`OPENAI_KEY`, with a separate application context. A stable dedicated secret avoids
invalidating resume checkpoints when the provider key rotates. With neither secret
configured, starting still works using a process-local random key, but restarting that
keyless server cannot restore active progress. Restarts with the same secret restore
stage metadata without a new model assessment; an active interview additionally
requires its verified server transcript. Live server state takes precedence over older
tokens. These progress tokens supplement Supabase login; they are not login credentials.
The verified candidate must match the token and Redis record owner before recovery,
including when the Redis record has expired. Anonymous legacy tokens are rejected.

Refresh restores drafts and the native viewport as well as messages, mode, timer,
and drawing. A valid `/interview?session=<UUID>` link opens that browser-local save
before considering the active pointer; Back/Forward reopens earlier saves after
any current turn finishes. Links require the same origin and browser profile.
Refresh of an explicit session link reopens that browser save. A bare `/interview`
first load opens the most recently created interview, even after viewing an older save.
Saved interviews lists entries by creation date, newest first, matching the date shown.
The dialog contains its scrolling, locks background page scrolling, and shows whether
more entries are above or below the visible list. History elapsed time prefers the
scorecard's server timing; older estimates are clock-aligned and capped at the configured
duration (45 minutes for legacy untimed saves). Saved interviews provides
Resume/View and explicit deletion with confirmation. Unopened timed sessions derive
live elapsed time and expiry from their saved deadline and clock calibration. An
expired row says Time expired and offers Finish, with time capped at its limit; it
does not claim a scorecard exists or generate one in the background. Legacy unfinished
records without a saved deadline say Saved with timing checked on reopen. History
refreshes its display clock while open without changing archived interview data.
New interview preserves history and starts a 45-minute session of the displayed
problem and difficulty. Active sessions require confirmation to end before either
switch action. Change problem clears the active pointer and opens the picker,
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

Before starting, the candidate selects 45 minutes (default) or 1 hour. A guarded
1-minute option is available only for development/admin testing.
`POST /api/interview/start` accepts optional `durationMinutes` of 45 or 60, plus
the server-authorized test value 1. The server creates `timing: { startedAt, deadlineAt, durationMinutes }`
and returns a clock-calibration timestamp (`serverTime`). Client-supplied start
times or deadlines are ignored. The deadline is included in the encrypted resume
checkpoint and stored with the interview in IndexedDB. Every completed chat
checkpoint retains the original deadline.

Stage timing scales from the 45-minute baseline. The shared client/server wrap-up
window is 8 minutes for a 45-minute session and 10 minutes 40 seconds for a one-hour
session. Scoring retains the one-third-duration evidence threshold (20 minutes
and at least two answered stages for a one-hour interview). One-minute tests remain
excluded from regular usage totals; one-hour sessions are ordinary interviews.
Existing saved attempts retain their original timing and require no migration.

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
covered, without unnecessary extra setup questions. Configured shared-fact patterns
recognize equivalent numeric shorthand and latency units in news-feed replies,
including facts supplied in the current reply; they never earn candidate technical
scores. The server derives pacing from the
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
discussion. **Draw / pause questions** remains separate. An empty board keeps the
design button disabled and displays a linked hint to draw at least one component;
typed messages still appear in chat while questions are paused. The candidate can explain
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
or a recap assuming completion. Entry guidance appears once; subsequent messages
keep the UI's listening state without interrupting the transcript. Explicit factual
questions can still be answered. Invitations and entry guidance name the same
Explain my design and Done explaining buttons as the UI; saved older invitations
remain recognized. Generated controls carry `source: "control"`, appear as activity
labels, and are excluded from candidate quote IDs. Legacy control-only text is also
excluded; a real explanation accompanying a typed pacing request remains evidence.
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
feedback retain a two-hour inactivity expiry. Local development uses process state;
private beta mode loads and saves validated JSON progress/feedback in Redis, retaining
only a request-owned working copy in RAM. Failed grading retries resend the frozen
evidence from IndexedDB and verify it against the shared hash.

The separate grader receives the verified server transcript (plus an unanswered candidate
send and at most one confirmed unsent answer), final diagram text and
PNG, selected difficulty, and problem-specific private rubric. It also receives
trusted product requirements and per-problem grading guidance: excluded collaborative
document editing is distinct from in-scope conflicting file replacements.
Clarification-stage questions about workload and timing are requirements-discovery
evidence, without proving a technical solution in other areas. Compare-and-set
and base-version checks count as concurrency evidence; accepted justified retention
alternatives remain valid assumptions. Topic checks include peak rate, dispatch
time, and plain-language retention proposals. A missing detail is distinct from
an entirely unexplored topic. It grades quality
across the available evidence without using stage order, stage coverage, or drawing
before clarification as scoring inputs. Level expectations set the technical depth.
Strict JSON output is validated with Zod, including exactly one entry per configured
rubric area and scores from 1 to 4. Each numeric score, strength, and gap requires
an exact candidate quote with its original message index or a real live diagram
element ID. The server prepares bounded candidate excerpts; the grader selects
their quote IDs and the server attaches the original words, avoiding rewritten
or paraphrased citations. Unsupported references and findings are removed. A numeric
score with no verified evidence becomes Not assessed while supported feedback is
retained. Each private rubric area has a topic pattern used to check whether candidate
answers, drawing labels, or a focused interviewer question explored that area. The
opening description and pacing controls do not establish assessment opportunities.
Unexplored areas remain unassessed even when the grader cites an unrelated real
quote or diagram. Attached freehand/image content retains visual uncertainty for
the grader. These topic checks only permit assessment and never establish quality.
Duplicate/missing
areas and malformed output still reject the result and are retried once. Provider failures
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
96,000 transcript characters in total at schema validation, with a stricter 96,000-byte
UTF-8 JSON bound on verified server evidence. Oversized input is rejected rather than
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
require verified session ownership; chat requires `resumeToken` on every request,
including when local state is cached. A token never substitutes for missing trusted
chat history. These establish the setup
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
The desktop drawing style panel starts collapsed, with a Styles / Hide styles toggle.
Choosing a shape tool leaves the left canvas available instead of opening an overlay
that intercepts drawing. Editor restoration normalizes the autosave baseline quietly.

Technical grading uses conservative anchors: 3 requires a concrete choice or
diagnosis with reasoning, while 4 additionally needs validation and tradeoff analysis.
Repeated interviewer numbers cannot establish bottleneck diagnosis. Server calibration
caps the single-server bottleneck area at 2 when its cited evidence contains no
diagnostic resource or measurement explanation, and removes a positive overall
signal based on that inflated assessment. Gap text must identify a useful issue,
its consequence, and an improvement; an evidence label alone is rejected. Diagram
references are displayed separately. Completed legacy scorecards are retained,
while future grading/retries use the current rules.

## Private beta deployment safeguards

Vercel deployments (or local `INTELIPREP_ENV=beta`) require model credentials,
a dedicated resume secret of at least 32 characters, and an Upstash Redis REST
endpoint/token. Missing settings or failed shared coordination return 503 before
model work. Builds and ordinary local development need no Redis credentials.
Redis configuration accepts either the Upstash REST URL/token pair or Vercel's
native `KV_REST_API_URL`/`KV_REST_API_TOKEN` pair. Explicit Upstash settings take
precedence as a pair; partial settings never borrow another database's token.
The release uses a protected Preview branch URL; `main` Git autodeploys are disabled.
Deployment protection must be enabled and verified in Vercel settings. This is
private tester access, separate from Supabase candidate account authentication.

Redis holds atomic endpoint quotas, an owner-fenced three-minute session lease,
and JSON progress/verified transcripts/frozen end hashes/cached scorecards with a two-hour inactivity
TTL. Each beta API request has an isolated RAM working copy, including stream
callbacks after the handler returns. The copy is removed after initial publication
or shared-lease release; it is never retained in a process-wide interview cache.
Shared state takes precedence over stale browser checkpoints. A valid
owner-bound checkpoint plus verified Google login proves session access. Native drawings
and PNGs remain browser evidence; the server also stores verified chat and the latest
turn's request hash/reply for safe retries. Ending validates submitted history against
server messages, allows an unanswered send and one confirmed final candidate answer,
and publishes the freeze before grading;
completed chat publishes progress before its completion event and unlocks before EOF.

Redis session records contain a validated plain checkpoint, optional verified transcript,
and optional scorecard,
with no application encryption or nested browser resume token. Cached feedback and
selected candidate quotes are readable in Redis. Older encrypted records remain
readable and are rewritten as JSON on the next successful save. Browser-issued
resume tokens retain authenticated encryption; `INTERVIEW_RESUME_SECRET` still
protects those tokens and hashes request-limit identities. Redis credentials and
HTTPS remain the access/transport boundary. Rollbacks must retain the JSON reader.

Per-account minute/hour/day quotas are chat 10/120/200, start 3/10/10, end 5/20/40,
resume 60/1000/3000, and error reports 30/300/1000. Chat/end additionally share
500-request hourly and 2000-request daily ceilings. All windows are checked and
incremented atomically; limits are request ceilings rather than dollar budgets.
Verified account IDs are HMAC-hashed for interview quotas; anonymous monitoring
uses only Vercel’s platform-overwritten IP header and ignores local forwarded headers. Exhaustion returns 429 with Retry-After.
Same-origin checks and actual streamed JSON byte limits precede model work: 4 MB
for chat/end, 32 KiB for start/resume, 2 KiB for monitoring. Model calls have a
45-second timeout without SDK retries. Grading shares a bounded provider budget across validation attempts: 120 seconds for core and 180 seconds for GenAI. Its browser deadline is 195 seconds, route maximum 210 seconds and owner-fenced shared session lease 240 seconds. Chat retains its 120-second route maximum.
Chat context retains complete recent messages and the opening within 32,000 UTF-8
JSON bytes, while the full verified transcript remains available for grading and
probe reuse checks. Each provider call checks instructions and escaped input text
against a 128,000-byte limit before network work. Images are separately bounded.
The recommended interactive model is `gpt-6.1-terra`, selected in `.env.example`;
the unset-model compatibility fallback remains `gpt-6.1-sol`. Replies, coverage and follow-up review use low
reasoning with a 4,096-token combined reasoning/output cap; scorecards use low
reasoning with a 16,000-token cap. Separate server-only interviewer and scorecard
model/effort settings live in `model-settings.ts`; legacy model overrides retain
their previous caps and sampling parameters. Sol requests omit temperature.
Existing input budgets, timeouts and bounded retries remain in effect. Normal
Sol/Terra discussion uses one structured follow-up generation instead of a draft
and repeated review calls. Static problem/rubric instructions are byte-identical
across turns; current stage, pace and question memory follow in a developer input.
Only the opening and last eight messages (within 32 KiB), plus up to 4 KiB of
extractive older context, reach interactive generation. The full verified
transcript remains available for grading, duplicate checks and stage evidence.
Coverage is not reassessed every turn while a stage's minimum time is still running.
Per-call logs contain model, elapsed time, input/output/cache and reasoning token
counts without logging request or response text.
Unsupported acknowledgements use neutral wording
rather than quoting candidate text; recognized injection requests receive a neutral
design redirect.
Recognized off-topic task requests receive that same redirect in every pacing mode,
without provider calls, technical acknowledgement, or stage advancement. Retry-After
seconds/date values produce a persisted retry deadline and a chat countdown. Retry
is disabled until that deadline. Generation may retry once before any delivered
output for provider 408/500/502/503/504 or connection failures, within a shared
85-second budget; 429, authentication errors, invalid input, cancellation and partial
output never trigger automatic retry. Invalid structured novelty checks fall back
to an unasked configured probe and log an allowlisted reason instead of failing chat.
Local development can set `INTELIPREP_TEST_MODEL_503_ONCE=1` to inject a 503 before
the first model generation attempt in each chat request. The normal bounded retry
then generates the reply. Request-scoped fault state prevents repeated injection;
production and private-beta modes ignore the flag. Route-level tests cover the
injection, successful retry and a single transcript commit without paid API calls.
Generated replies and reviewed acknowledgements filter copied candidate passages
before display, including quotations split across stream chunks. Short component
names and diagram labels remain usable. Reviewer evidence fields may retain exact
quotes for internal validation; visible acknowledgements must paraphrase.

API request IDs and allowlisted structured runtime events cover requests, provider,
streaming, coverage, grading and framework failures without raw errors or evidence.
Browser errors report bounded/deduplicated SHA-256 fingerprints and allowlisted
categories; autosave and render failures are included. No external alert service
is provisioned. `GET /api/health` checks settings/Redis without a paid model call.
GitHub Actions runs checks and a webpack production build on Node 24. Setup,
deployment, protection verification, smoke tests and rollback are documented in
`README.md`, `.env.example` and `docs/deployment.md`.


## Candidate sign-in and account isolation

Supabase Auth manages accounts and cookie-based login; the initial UI uses Google.
`src/proxy.ts` refreshes auth cookies and disables caching on interview/auth responses.
Pages and interview handlers independently verify identity with `getClaims()`.
They never authorize using unverified cookies, `getSession()`, or editable metadata.
The PKCE callback exchanges the code and redirects only to a fixed same-origin page.
Sign-out is a same-origin POST, revokes the local provider session when available,
and clears the app’s cookies even during a provider outage.

Start binds a session to the verified candidate. Chat/resume/end and cached grading
check that identity against both browser progress tokens and Redis progress before
restoring or returning data. Client owner fields cannot assign ownership. Browser
requests also carry an expected account header, checked against the authenticated
identity, to reject late requests if cookies change while a request is being prepared.

Browser storage instances capture one user ID permanently. Account changes close
that scope, cancel pending fetches/writes and hide the workspace; late callbacks
cannot switch to another account’s database. Sign-out saves the latest draft before
closing the scope. Auth events and a sign-out broadcast invalidate other open tabs.
API-driven account invalidation requires the app's explicit
`X-Interview-Auth-Error` marker: `sign_in_required` with 401, or `account_changed`
with 403. Status alone never invalidates a browser account. Model-provider
401/403 errors are dependency failures returned as 503 with a generic interviewer
unavailable message; provider diagnostics remain separate from login markers.
Other provider failures return 502, except rate/quota failures which retain 429.
Sign-in-service outages also remain recoverable 503 responses without an account
invalidation marker. No dependency failure redirects the candidate to sign-in.
The Back/Forward cache hides the previous page and reloads before showing history.
History is local to this browser profile and origin, and does not sync across devices.
Anonymous history is preserved outside account history; migration is a separate,
explicit policy rather than an automatic transfer to the first account to sign in.

## November 2026 interview usability contract

The candidate entry point is Home (`/`), with browser-local recent sessions and an
explicit Resume link. `/interview/new` presents the full level-specific public
opening and pacing instructions before Start creates the server deadline.
`/interview/[id]` restores a verified interview, and ended interviews replace the
URL with `/interview/[id]/results`. Results URLs for live saves return to the live
URL. Legacy `/interview?session=<id>` redirects to the corresponding interview.
Storage remains version 1; all new checkpoint and scorecard fields are optional.
History stores every interview attempt per account in this browser, across difficulty and duration. Home shows the three latest attempts; View all reveals the rest. Reading history never mutates records or the selected interview. Explicit deletion only affects the selected attempt; unreadable and legacy records remain intact. Sign-out keeps history. IndexedDB remains account scoped. A bounded account/session/tab draft
journal closes the 300 ms debounce and unload window without replacing history.

Stage criteria remain private, structured, quote-verified assessments. Topic
coverage alone no longer advances a 45-minute session. Stage entry times persist
in shared records/checkpoints: clarify has a 3-minute minimum and 8-minute maximum;
core has an 8-minute minimum and 15-minute maximum. Drawing leaves on explicit
review with a sketch. Scaling holds until the final 8 minutes, following the
acceptance rule that wrap-up must never start earlier. At that boundary the server
forces wrap-up, including on resume; the client refreshes that checkpoint without
remounting the board. The final-time exception overrides other minimums. One-minute
tests skip minimums and appear in setup only with
`NEXT_PUBLIC_ENABLE_TEST_INTERVIEWS=1`. Level timings are identical.

Every turn receives the current semantic diagram, resolved arrow bindings, loose
text and changes, labeled “Candidate’s current whiteboard”. Images supplement the
text. Explicit PostgreSQL/Cassandra and other database contradictions are checked
before a discussion reply; a mismatch is asked once and is also attached as a
scorecard diagram-consistency note. Later affirmative corrections supersede older
choices. Questions are held during explanation, as confirmed by the user. The
server retains an open question across drawing and explanation. Done explaining
requires a labeled component and a sent explanation message. A reply outside the
paused modes ends with a question or a concrete instruction.

The live page has only End interview as a session control. Board/Chat tabs replace
the desktop split below 900 px; below 600 px a dismissible laptop note appears once.
Results have top practice links and Scorecard/Transcript/Final diagram tabs. Final
diagrams are read-only, fitted, and hide editor toolbars. New scorecards hide all
numeric scores before one third of the allowed duration (15 of 45 minutes), or
when fewer than two stages contain candidate answers. Exact evidence is retained.
An empty attempt shows only the retry explanation. Existing saved scorecards still
parse without the new optional metadata.

Slow replies show Still thinking at 15 seconds and a cancel-and-retry action at 45
seconds. Retry preserves the candidate message and turn ID, so a completed request
is replayed rather than billed twice. Image export has a three-second text fallback
and never calls editor viewport APIs. Browser development timing separates image
preparation from total reply time; server completion logs include total turn time.

Excalidraw 0.18.1 exposes history.clear but no supported history export/import API.
Undo/redo remains available during the mounted session; its internal stack cannot
be restored across a full refresh. Native scenes retain labels, bindings, files,
and viewport. onChange does not write elements back into Excalidraw. Production
Cmd+A/Cmd+D verification did not reproduce InvalidFractionalIndexError; no unstable
library upgrade or exception suppression was added.


### Interview history presentation (November 6)

Every attempt remains stored independently. Home shows the three newest-created attempts, with View all revealing every attempt. Creation time and a stable ID tie-breaker determine display order; later saves and scorecards update only their own attempt.

History reads are read-only and never rewrite the active pointer or discard records. Existing version-1 records and legacy metadata remain readable without migration. Explicit deletion marks only the selected attempt so a late save cannot resurrect it; older attempts remain usable. Same-attempt revision conflicts still protect concurrent tab edits. Load latest version refreshes that same interview from its verified server transcript.

Home and the Brief disclose that every attempt is retained in the current account/profile/origin. Server verification sessions keep their existing expiration policy and are not a second saved-interview history.

### November 6 browser retest corrections

A drawing handoff uses the configured invitation once and enters stage 2, including
an explicit Start drawing before the clarify minimum. Candidate answers retire
answered questions; paused technical questions use quote-verified coverage so an
unrelated drawing explanation does not discard them. The complete verified
transcript supplies asked-question memory before model-context truncation, and
Redis preserves covered topics. Follow-up banks declare stage indexes; generated
questions, replacements, and bank fallbacks all pass novelty, continuity and
current-stage checks before display. Repeated acknowledgements are trimmed.

Semantic labels prefer Excalidraw originalText and normalize whitespace for nodes,
arrows and loose text. The final scorecard has one optional diagramConsistency
section that records historical database conflicts, later corrections and stated
components missing from the final board. Existing scorecards remain readable.

Interviewer requests abort after 45 seconds even when a fetch or stream ignores
its signal. The pending turn ID survives retry and End becomes available after
the timeout. Recovered messages open with Resend and Dismiss; sending or dismissing
removes the notice without replacing the current draft.

POST /api/interview/freeze validates owner and canonical evidence, freezes one
server endedAt and persists the evidence hash without a model call. It uses the
resume quota rather than a model quota. Grading uses that frozen checkpoint;
results-route restoration automatically starts unfinished grading once. Navigation
after ending switches to results as soon as the freeze is confirmed, while grading
continues in the mounted workspace. All elapsed-time displays
use the frozen end time. Local start quotas are skipped unless
INTELIPREP_DEV_START_LIMITS=on, while deployed limits always apply. The Brief puts
a focused rate-limit explanation beside its disabled Start button with a readable
local retry time. The 1-minute option requires NEXT_PUBLIC_ENABLE_TEST_INTERVIEWS=1;
?debug=1 does not enable it.

## Private admin reporting (November 6)

The `/admin` server-rendered dashboard and GET-only `/api/admin/*` routes authorize
only the exact configured `ADMIN_USER_ID`, with fresh Supabase Auth verification
at each data boundary. Missing configuration denies access. Admin data is never
publicly cached, and account metadata cannot grant privileges.

Supabase's `auth.users` is the existing account source. The additive private
`interview_admin` schema persists operational interview metadata, milestone times,
feedback projections, failure references and per-attempt AI usage. RLS is enabled,
with no schema/table access for browser roles. Redis remains the temporary
canonical interview store and IndexedDB remains browser history; no saved
interviews are deleted or moved. Unrecoverable history is unavailable.

Server lifecycle hooks preserve start/end times and deduplicate by interview ID.
Completion is independent of feedback generation. Existing explicit local closure
also best-effort records an owner-checked server exit. Inactivity remains
unfinished, with duration estimated only through last recorded activity. Drawing
pauses questions, not elapsed time. Average duration uses completed interviews with
valid timing only. Admin/test activity is excluded by default.

Creation, response, persistence and feedback errors retain safe timestamps,
operation/category and request/interview references. Model instrumentation covers
all reply, assessment, question-review and grading attempts, including retries;
missing token usage or pricing is never zero. Tracking failures do not fail
interviews. See [admin.md](admin.md) for configuration, exact definitions, privacy,
coverage limitations and live database acceptance checks.

### Retest reliability update (November 6)

Unanswered questions are kept in a server-owned FIFO queue. Structured discussion output clears a question only by referencing a real candidate excerpt after the question was asked. Side questions and silent drawing/explaining turns preserve the queue. Diagram additions/renames survive listening turns until Done explaining, where the reply names them once. Current-stage topics have a three-follow-up budget before other topics are probed; deliberately resumed questions remain queued until resolved.

History reads preserve every attempt and existing legacy metadata. Older attempts can be reopened and saved independently. Concurrent revisions of the same attempt still conflict; explicit deletion tombstones only that attempt. New interview starts use account-scoped idempotency IDs; beta Redis atomically stores the response, canonical transcript and a single quota charge.

### Calm visual theme (November 6)

Home and `/interview/new` use the shared `ArchitectureHero` inline SVG only in
those pages' hero. Interview, whiteboard, chat and scorecard content have no
illustrated background. Lora is the display face; Geist is the UI face. Shared
colors, spacing and corners are CSS variables in `theme.css`.

The accessible 680×350 diagram has a cream laptop, amber load balancer, three app
servers, coral cache and teal database. Three teal request packets run on a
nine-second loop at three-second intervals; arrivals pulse the matching
endpoint. Only transforms, opacity and outline stroke animate. Hidden tabs
pause animations; reduced motion shows a still frame. At narrow widths the
panel sits above the headline; otherwise it stays clear of the headline text.

The Home shows three recent attempts; View all reveals remaining records.
Dates and status labels are display-only. The Brief retains existing choices,
Start action and house-icon stage preview. No phases or timer rules change.
Server waiting and browser-history initialization use skeletons. The unused
local OPTIONS pre-warm was removed from startup; actual interview creation,
auth checks, quotas, routes, stored records and grading are unchanged.

### Database-managed beta access (November 7)

Exact Google emails and approval state live in the private
`interview_admin.beta_invites` table. `/admin/access` lets the freshly verified
configured owner approve or revoke an email. Writes are same-origin, size-bounded,
strictly validated POSTs, using the existing restricted runtime database role.
The email primary key and upsert preserve one row and the original creation time.
Reporting remains read-only; no saved interview is changed by an access update.

Candidate pages and APIs await the current database decision after verifying Auth.
The existing Auth client calls `is_beta_invited()`, a no-argument SECURITY INVOKER
function returning only the caller's own RLS-protected membership boolean.
Authenticated users can read only their own invitation's email/approval columns;
they cannot edit invitations or read reporting/audit fields. Anonymous execution
is denied. No permission cache or environment-list fallback delays revocation.
An unavailable database fails closed with 503. The verified configured admin
retains access independently. The migration imports any legacy environment list
without overwriting existing rows or revocations. Google OAuth testing and Vercel
deployment protection remain separate admission gates.
# Beta practice feedback (November 2026)

Results include an optional survey independent of scorecard generation, including
empty and short interviews. It records interview experience, willingness to
practice again, an optional 2,000-character comment, or a skip. Send and Skip
briefly show Thanks and permanently dismiss that interview's card via a
server record plus an account-scoped local dismissal cache. The account menu
offers the same form for independent written feedback at any time.

`POST /api/feedback` is candidate/invite protected with a strict 4 KB body and
5/minute, 30/hour, 60/day limits. It verifies interview ownership in the private
reporting database. A user/interview unique constraint makes repeat sends an
update; null interview IDs represent independent menu messages. `GET /api/feedback`
returns only the signed-in owner's handled boolean for a validated interview ID,
using a separate read quota. No comments enter model requests or server logs.

The private `interview_admin.feedback` table has RLS and reporting-service grants
only. `/admin/feedback` offers environment-scoped counts, email/comment search,
exclusion filters and 20-entry pagination. User detail shows the survey beside
the corresponding interview. Both page entry and data functions re-check admin
authorization. This additive feature does not change saved sessions or grading.
# Beta readiness: configured opening questions

New interview transcripts begin with only the selected problem and level's
closing clarification question. The full configured brief stays on the Brief
page and pinned problem panel. Shared setup facts come from that trusted brief
and factual interviewer replies; they do not award candidate evidence. Legacy
saved openings display their own closing question without rewriting stored chat.
# Beta readiness: scoring eligibility

The scorer and early-end warning share one rule: one third of the configured
duration and technical answers in two stages. The server checks eligibility
before any grading provider call. Ineligible sessions get a deterministic,
neutral result with elapsed time, the rule and a link back to the Brief. They
have no model judgments or area scores. New results persist `notScoredReason`
and reporting stores `not_scored_reason`; old saved scorecards remain readable
and historical outcomes are not backfilled.

## GenAI application-design track

The existing interview lifecycle also supports a `genai` track. The original eight
JSON configurations default to `core` and retain their content and scoring.
The picker groups public titles under Core system design and AI / GenAI.

Server-only GenAI content separates asked facts, reference estimates, expected
design, red flags, and assumption guidance. The candidate sees only the brief.
A structured intent call selects zero or more allowed fact IDs, without seeing their values. Its instructions are problem-independent; meanings and raw-versus-derived distinctions live in fact descriptions. Design recommendations prompt a justified candidate choice, and derived quantities prompt an estimate instead of a supplied answer. It retries once on provider or parsing errors, then asks for a rephrase without failing the interview. IDs attached to a non-fact intent are discarded. The server answers every requested fact from its level config. A specific value outside the fact list gets an explicit unspecified response and an invitation to state an assumption. General invitations receive a topic-free clarification prompt, never a claim that a value is unspecified. Candidate assumptions
are not silently replaced with reference-anchor assumptions. A private structured
arithmetic check returns a verified redo verdict; it never sends an anchor answer
to the reply-generating prompt or browser. Expected designs are grading-only.

Scorecards already support per-problem areas, up to ten in the provider schema.
GenAI uses seven areas: five problem-specific areas, including cost, plus
Evaluation and quality and Safety and security. There are no numerical weights or
weighted total; the existing evidence-validated 1–4/null scale and overall signal
are retained. No core scoring or rubric is changed. See
[the keyword inventory](interviewer-keywords.md) for every routing pattern family.


### Discussion exhaustion and sentence novelty

Finite stage probes are guidance, not an exhaustion message. A bounded structured
request writes a fresh question grounded in a verified candidate quote and the
current stage. The server rejects repeated questions, repeated sentences and
invented grounding. If no useful question remains in a discussion stage, the
server may enter the next stage before its minimum time without granting coverage
or grading credit. The final stage can offer a contextual instruction to finish.
Every reply path checks the complete verified interviewer transcript for repeated
sentences; duplicated factual replies are rephrased without adding facts.


Topic memory uses canonical issue IDs across the whole verified interview, not
stage-prefixed counters. A structured semantic check reads earlier explanations
and new answers, validates candidate quote IDs, and closes answered issues even
when the candidate used different words. Each issue can be asked at most twice
across stages on either track. Historical stage-keyed counters remain readable.


Diagram labels are plain lowercase words inside interviewer sentences on both
tracks. Quotation marks are removed, acronyms are preserved and sentence starts
remain capitalized. Candidate messages and scorecard evidence quotes are unchanged.


Scorecard generation uses low reasoning, including deployments with an older high
effort setting. Full transcript counter-evidence, private rubrics and scoring
weights are unchanged. Clients may request NDJSON progress events for evidence
reading, feedback writing and evidence checking; JSON clients remain compatible.
The UI reports server stages, not timer-based simulated progress.

Re-explanation revisions receive a short, evidence-grounded acknowledgement of the
change, without a question or evaluation. Entry controls and messages without a
specific change remain silent. Listening turns persist their verified checkpoint
but send no text deltas; the completed listening frame and successful EOF are
required before the browser accepts that checkpoint.

The adaptive GenAI benchmark uses a model candidate that sees only public brief
content, the actual conversation and its own diagram. Its strong, buzzword and
weak policies are separate from application prompts and grading. App, simulator
and semantic-audit usage are metered separately. Only the interview clock is
simulated; provider and grading timings use real elapsed time.

Grading sends the complete transcript and compact quote locators. Each locator
retains its original ID and a short prefix, with the message index encoded in
the ID. Validation and displayed evidence still use the original full candidate
quotes. This removes duplicated answer text without raising the model input cap
or dropping transcript evidence. Modern-model wrap-up turns use the same
structured question-memory path as other discussion stages.

When a configured bank is exhausted, its stage topics remain guidance for a new,
genuinely distinct boundary in the candidate's actual design. A semantic check
rejects already asked or answered issues. Fresh questions receive their own
server-owned IDs without reopening closed bank issues. Bank and pending asks
also receive a direct history-budget check so aliases across stages cannot
permit a third same-issue ask. Imperative asks count too. Retiring a rejected
pending question does not award scoring coverage. Final exhaustion asks once:
"We're close to time. Is there anything you'd change or add before we wrap up?"
The server supplies this without a model call. Later final thoughts are saved
while the interviewer listens, without another closing command or invitation.

Benchmark audits account for every delivered ask, including imperatives, and
separate app usage from candidate-simulator and independent-audit overhead.
The resumed post-guard live acceptance is documented as incomplete after a
provider-credit failure; beta publication with that limitation was approved.

### Public reply sentence filtering

The final public-reply filter releases checked sentences as they arrive. It
recognizes generated `fresh:` hashes and literal serialized topic keys from the
selected problem configuration. Ordinary field names, pipes between percentiles
and bare request IDs remain eligible. Contaminated sentences are dropped without
raising a candidate-facing error. If nothing remains, the server supplies a safe
configured continuation or the existing final-thoughts invitation.

Plain provider streams can release a checked sentence before provider completion.
Structured question planning and stage/pacing checks still validate their result
before releasing that question; the ID filter does not add a whole-reply buffer.

### Light and dark appearance (November 11)

Light is the default for new visitors. Theme colors, including the home animation
and mascot pigments, are defined in `src/app/theme.css`. Dark overrides are scoped
to `html[data-theme="dark"]`. Existing illustration geometry, captions, interview
rules and stored attempts are unchanged. Cards use neutral surfaces in both modes.

A sun/moon control appears in page headers, including sign-in and admin. It saves
the preference in `mockmeai-theme` (cookie) and `mockmeai:theme` (localStorage), with
each storage access guarded. The server reads the cookie; a CSP-nonced head script
restores a storage-only preference before body paint. A cookie takes precedence
when both stores are present. System dark-mode preference does not change the
first-time light default.

The editor follows this preference through Excalidraw's native theme. Its light
canvas is darkened by Excalidraw on screen, without editing the saved elements,
background metadata, scroll, or zoom. Image exports for both chat and grading
explicitly use light mode on a white background, independent of the visible theme.
Palette contrast and source-color checks run in the unit suite; stubbed browser
tests cover first paint, reload, both viewports and real PNG export pixels.

### Additional ML systems and track selection (November 11)

The existing `genai` engine also hosts video recommendations and ad click
prediction. No new interview lifecycle is introduced. The candidate picker uses
a keyboard-accessible two-option native radio group, defaults to System design
for a new browser, remembers the last selected track per account and only lists
problems in that track. The track display name is AI / ML system design. Next
practice suggestions are restricted to that track, including rendering older
scorecards without modifying the saved records.

AI badges identify AI / ML titles in the Brief, live/results header and history.
Configured AI / ML phase titles are public metadata in the catalog/start
response; the rubric, hidden facts, anchors and expected design remain server-only.
Older saves can omit this metadata. Core phase labels and scoring are unchanged.
Private per-problem interviewer rules and configurable evaluation/safety area
names let ML exercises reuse the same fact classifier, estimate checks and
seven-area grading path without calling them GenAI applications.
