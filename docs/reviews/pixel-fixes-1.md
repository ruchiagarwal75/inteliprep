# Pixel fixes, round 1

Source: `docs/play-content/pixel-fixes-1.md`. Work stays on beta. No live model calls, environment edits or Production deployment.

| Item | Cause and fix |
| --- | --- |
| 1. Hair visibility | The original dark hair blended into the indigo sky. A one-cell purple-gray silhouette outline and stepped curl bumps keep the original face and opaque source pixels intact. |
| 2. Mascot size and path placement | The old 28-cell canvas rendered the visible character too small. Large guides now use a 140-pixel canvas with whole five-pixel cells, beside the current node with a pixel speech tail. Sheets keep the smaller size. The path has room for the larger guide on phones. |
| 3. Active timing and stale resumes | The old client and submit path used start-to-now wall time. Visible tabs now renew a short server lease, hidden tabs pause, and each drill is capped at three times its existing par time. After two hours away, only unanswered snapshots regenerate. Revisions reject answers from old tabs, and conflict recovery loads the current question. Answered records and rewards remain intact. |
| 4. Rounded saved inputs | The current authored inputs were already rounded. Old saved templates could still use step 1. Resume checks the saved parameter grid against the current definition, regenerates outdated unanswered variants once and preserves answered rows. Parameter comparison ignores JSON key order. |
| 5. Friendly math feedback | Answers use at most three significant figures and friendly units. Worked calculations are built from numeric inputs with the correct grouping. Legacy saved math results get the same presentation on read without changing their stored grades, time or XP. |
| 6. Chest celebration | The old opening lasted 240 ms and could be hidden by an immediate level-up. The opening now has three 200 ms frames, a gold burst and centered server-awarded XP for 1.2 seconds. Level-up display waits for it, while totals still update. Reduced motion shows a static reward. |
| 7. Correct-sheet button | CONTINUE uses an AA-contrast green on correct sheets. Wrong sheets keep the world color. Browser regression coverage includes timing pauses, a five-hour resume, stale-submit recovery, numeric feedback, the chest midpoint and reduced motion. |

## Storage and timing

`20261112081802_play_active_drill_time.sql` adds timing and revision metadata only. It has been applied to the existing IntelliPrep database. Owner RLS remains enabled, browser timing writes are denied, and the reporting role retains the required access. There is no deletion or bulk replacement of answers, results or rewards. Other environments can run `npm run db:play`; `npm run db:play -- --verify` checks the clock columns too.

A visible page sends one presence heartbeat every ten seconds. Time comes from server timestamps, never a duration supplied by the client. Normal hide/page-exit events pause it. A missing final event can add at most one twenty-second lease. Reading a finished round does not restart its clock. Historical active time cannot be reconstructed from old wall-clock records, so stored completed results are not rewritten. Long legacy times are displayed in hours and minutes.

## Verification

`npm run check` and `npm run build` run after each item commit. The full production-browser suite has 33 passing tests with local Auth, Postgres and model fixtures. It does not call a real model provider. Schema tests apply the migration twice and check owner isolation, preserved answered rows, unchanged points, stale revisions, hidden time and time caps.

Screenshots live in ignored `artifacts/pixel-fixes-1/`: the larger path mascot in both themes at 1440 and 375 pixels, friendly math results with numeric work, the chest opening midpoint, and resumed timers. These are synthetic attempts only.

## Files by item

### 1. Hair visibility

- `docs/play-content/pixel-fixes-1.md`
- `src/app/theme.css`
- `src/components/play/pixel-art.test.ts`
- `src/components/play/pixel-art.ts`
- `src/components/play/pixel-mascot-art.ts`

### 2. Mascot size and path placement

- `src/components/play/game-guide.module.css`
- `src/components/play/game-guide.test.ts`
- `src/components/play/game-guide.tsx`
- `src/components/play/level-path.module.css`
- `src/components/play/level-path.tsx`
- `src/components/play/level-up.tsx`
- `src/components/play/round-summary.tsx`

### 3. Active timing and stale resumes

- `src/app/api/play/activity/route.ts`
- `src/app/api/play/submit/route.ts`
- `src/components/play/drill-card.tsx`
- `src/components/play/drill-runner.tsx`
- `src/components/play/round-summary.tsx`
- `src/components/play/soft-timer.tsx`
- `src/lib/play/completion.ts`
- `src/lib/play/drill-activity.ts`
- `src/lib/play/drill-time.test.ts`
- `src/lib/play/drill-time.ts`
- `src/lib/play/public.test.ts`
- `src/lib/play/public.ts`
- `src/lib/play/question.ts`
- `src/lib/play/round-refresh.ts`
- `src/lib/play/round-store.ts`
- `src/lib/play/rounds.ts`
- `src/lib/play/submit.ts`
- `supabase/migrations/20261112081802_play_active_drill_time.sql`
- `tests/e2e/reporting-fixture.mjs`
- `tests/play-active-time.test.ts`
- `tests/play-game-migrations.test.ts`

### 4. Rounded saved inputs

- `src/components/play/drill-runner.tsx`
- `src/lib/play/authored-content.test.ts`
- `src/lib/play/math.test.ts`
- `src/lib/play/math.ts`
- `src/lib/play/round-refresh.ts`
- `src/lib/play/submit.ts`
- `tests/play-math-refresh.test.ts`

### 5. Friendly math feedback

- `src/lib/play/grade.test.ts`
- `src/lib/play/grade.ts`
- `src/lib/play/math-presentation.test.ts`
- `src/lib/play/math-presentation.ts`
- `src/lib/play/round-store.ts`
- `src/lib/play/submit.ts`

### 6. Chest celebration

- `src/components/play/chest-node.tsx`
- `src/components/play/chest-prize.module.css`
- `src/components/play/chest-prize.tsx`
- `src/components/play/pixel-sprite.module.css`
- `src/components/play/play-rewards.tsx`

### 7. Correct-sheet button

- `docs/reviews/pixel-fixes-1.md`
- `scripts/migrate-play.mjs`
- `src/app/theme.css`
- `src/components/play/drill-card.tsx`
- `src/components/play/drill-runner.tsx`
- `src/components/play/pixel.module.css`
- `src/lib/theme-palette.test.ts`
- `tests/e2e/fixture-accounts.mjs`
- `tests/e2e/fixture-service.mjs`
- `tests/e2e/play-pixel-fixes.spec.ts`
- `tests/e2e/reporting-fixture.mjs`

