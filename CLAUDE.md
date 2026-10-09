# InteliPrep

AI system design interviewer. An AI runs a 45 minute system design interview over
text chat while watching the candidate's Excalidraw whiteboard, then produces a
scorecard against a rubric.

**Read [docs/spec.md](docs/spec.md) before big changes.** It is the source of
truth for architecture, the interviewer engine, phases, the data model, and the
API surface. If a change contradicts the spec, update the spec in the same PR.

Status: early prototype with diagram-aware streaming chat and an Excalidraw
whiteboard and diagram change detection. Image input, interview phases, and
persistence come later.

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
  keeps the latest scene in memory and attaches it to each chat request.
- `POST /api/chat` — validates `{ messages, scene?, previousScene? }`, streams the
  reply back as plain text. The server extracts a shared semantic graph for each
  scene and passes the current description and the change summary as user data
  to the interviewer. The later session route uses SSE instead (see spec "API design").
- Scene limits: 500 elements, 1,000 characters per label, and 4,000 characters
  of diagram context. Unsupported visuals and unresolved connections are marked
  explicitly. Raw editor state and image files are omitted from chat requests.
- Diagram changes are capped at 2,000 characters. IDs identify additions,
  removals, renames, rewiring, note edits, and frame changes; layout-only edits
  are ignored. The browser stores an isolated snapshot after each complete,
  nonempty reply. Failed or interrupted replies do not advance that baseline.
- In development, `/api/chat` logs the extracted diagram text under
  `[chat] Current whiteboard diagram` and the diff under `[chat] Whiteboard changes`
  in the dev server terminal.
- No persistence: messages and the whiteboard scene vanish on refresh.

## Notes

- `AGENTS.md` is generated and rewritten by `next dev`; commit its changes
  alongside your work rather than reverting them.
- `npm audit` reports 5 high findings, all from `braces` inside
  `eslint-config-next`. Dev-only, and the only "fix" downgrades ESLint config to
  v14. Left as is deliberately.

@AGENTS.md
