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

**3. PNG.** Export with `exportToBlob` at max 1280 px wide. Send it only when the diagram changed since the last turn, to save cost.

Edge cases to handle:

- Arrows not snapped to a box: fall back to the nearest box by distance.
- Unlabeled boxes: show as "unlabeled rectangle" so the AI can ask what it is.
- Grouped or framed elements: list the frame name as a section header.
- Very large diagrams: cap the text at about 4,000 characters and rely on the PNG for the rest.

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

**System prompt rules**

- You are a senior engineer running a system design interview. Be friendly and direct.
- Ask one question at a time. Keep replies under 80 words.
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
