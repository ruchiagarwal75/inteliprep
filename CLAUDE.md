# InteliPrep

AI system design interviewer. An AI runs a 45 minute system design interview over
text chat while watching the candidate's Excalidraw whiteboard, then produces a
scorecard against a rubric.

**Read [docs/spec.md](docs/spec.md) before big changes.** It is the source of
truth for architecture, the interviewer engine, phases, the data model, and the
API surface. If a change contradicts the spec, update the spec in the same PR.

Status: scaffold only. No features are built yet.

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

Not yet installed — add when the milestone needs them (see spec): Excalidraw,
an LLM SDK, Postgres/Supabase, auth, Zod.

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
  components/   # React components (chat panel, whiteboard placeholder)
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

- `/interview` — split view, whiteboard placeholder left, chat right.
- `POST /api/chat` — validates `{ messages, scene? }`, streams the reply back as
  plain text. `scene` is accepted and ignored until scene-to-text lands. The
  later session route uses SSE instead (see spec "API design").
- No persistence: messages live in React state and vanish on refresh.

## Notes

- `AGENTS.md` is generated and rewritten by `next dev`; commit its changes
  alongside your work rather than reverting them.
- `npm audit` reports 5 high findings, all from `braces` inside
  `eslint-config-next`. Dev-only, and the only "fix" downgrades ESLint config to
  v14. Left as is deliberately.

@AGENTS.md
