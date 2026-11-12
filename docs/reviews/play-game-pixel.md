# Play pixel accents review

The implementation follows `docs/play-content/game-pixel.md`. Only Play presentation changes. The existing interview engine, whiteboard, problem content and reward rules are unchanged. No live model calls were made.

## Sections

| Section | Change |
| --- | --- |
| 1. Design system | Licensed local Inter and Press Start 2P, Play-only tokens, notched boxes, contrast checks and segmented bars. |
| 2. Sprites | Seven supplied grids preserved cell for cell. Four new same-head poses, chest opening frames and an authenticated sprite review page. |
| 3. HUD | Pixel flame, daily square, star, server XP and ten-block player-level progress. Unavailable values stay unavailable. |
| 4. World path | World banner, square nodes, checks, locks, real names, wide dotted path and pixel chests. One Start action per current level. |
| 5. Drills | Verified correct/wrong progress blocks, Inter questions and options, pixel controls, thinking/correct/wrong sheets and keyboard support. |
| 6. Rewards | Stepped stars, XP, stat boxes, badge flips, square confetti, real completion titles and server-threshold level-up screens. |
| 7. World map and sounds | Original pixel emblems and world cards. Optional original square-wave tones for correct, wrong, level up and chest. Off by default. |
| 8. Compatibility | Retained real names, existing legacy-star backfill and hidden zero/one combos. No duplicate migration. |
| 9. Verification | Stubbed production browser flows, scoped pixel-style precedence, resolved-color checks and 44 screenshots across both themes and widths. |

## Decisions

- The current light default and saved theme preference are kept. Dark mode uses the indigo night-sky palette.
- Placement keeps six drills and six blocks. Level rounds keep five blocks.
- Player thresholds come from the server. The 400 XP example does not replace the real curve.
- The existing `20261112060643_play_legacy_stars.sql` already backfills older passes. No new database migration is required. Regression tests apply it twice and preserve attempts, timing and points.
- Public completion titles are enriched on read for old saved rounds, without rewriting their results.
- The original non-Play mascot stays unchanged. `/play/sprites` shows the five new Play poses for review and requires the normal account/invite gate.

## Verification

`npm run check` and `npm run build` run after each section commit. Private-bundle checks keep answers, math formulas and rubrics out of browser chunks.

The production-browser suite uses local authentication, Postgres and model fixtures. It covers the complete Play and Mock flows, retries, rewards, theme persistence, keyboard controls, reduced motion, both viewport widths and whiteboard regressions. No real AI provider is contacted.

The screenshot set has 11 states at 1440 and 375 pixels, each in light and dark: topic map, world path, selected answer, correct sheet, wrong sheet, Checking, level complete, level failed, player level up, chest open and all five poses. Files live in ignored `artifacts/play-game-pixel/`, with an HTML index and a manifest. Screenshots are not added to git.

## Files by section

### 1. Design system

- `docs/play-content/game-pixel.md`
- `docs/play-content/game-polish-round-3.md`
- `docs/play-pixel-design.md`
- `public/fonts/play/Inter-OFL.txt`
- `public/fonts/play/Inter-latin.woff2`
- `public/fonts/play/PressStart2P-OFL.txt`
- `public/fonts/play/PressStart2P-latin.woff2`
- `public/fonts/play/manifest.json`
- `scripts/verify-play-fonts.mjs`
- `src/app/globals.css`
- `src/app/play-fonts.css`
- `src/app/theme.css`
- `src/components/play/pixel.module.css`
- `src/components/play/play-frame.tsx`
- `src/components/play/segmented-bar.module.css`
- `src/components/play/segmented-bar.test.ts`
- `src/components/play/segmented-bar.tsx`
- `src/lib/theme-palette.test.ts`

### 2. Sprites

- `src/app/play/sprites/page.tsx`
- `src/app/theme.css`
- `src/components/play/game-guide.module.css`
- `src/components/play/game-guide.test.ts`
- `src/components/play/game-guide.tsx`
- `src/components/play/pixel-art.test.ts`
- `src/components/play/pixel-art.ts`
- `src/components/play/pixel-chest-art.ts`
- `src/components/play/pixel-chest.tsx`
- `src/components/play/pixel-grid.ts`
- `src/components/play/pixel-mascot-art.ts`
- `src/components/play/pixel-mascot.tsx`
- `src/components/play/pixel-pose-gallery.module.css`
- `src/components/play/pixel-pose-gallery.tsx`
- `src/components/play/pixel-sprite.module.css`
- `src/components/play/pixel-sprite.tsx`

### 3. HUD

- `src/components/play/daily-goal.module.css`
- `src/components/play/daily-goal.tsx`
- `src/components/play/game-hud.module.css`
- `src/components/play/game-hud.tsx`
- `src/components/play/mode-nav.test.ts`

### 4. World path

- `src/app/play/[topic]/page.tsx`
- `src/components/play/chest-node.module.css`
- `src/components/play/chest-node.tsx`
- `src/components/play/level-path.module.css`
- `src/components/play/level-path.tsx`
- `src/components/play/stars.module.css`
- `src/components/play/stars.tsx`
- `src/components/play/world-banner.module.css`
- `src/components/play/world-banner.tsx`
- `tests/e2e/play-game.spec.ts`
- `tests/e2e/play-helpers.ts`

### 5. Drills

- `src/components/play/answer-sheet.tsx`
- `src/components/play/drill-answer-form.tsx`
- `src/components/play/drill-card.tsx`
- `src/components/play/drill.module.css`
- `src/components/play/earned-points.module.css`
- `src/components/play/earned-points.tsx`
- `src/components/play/lesson-header.test.ts`
- `src/components/play/lesson-header.tsx`
- `src/components/play/lesson.module.css`

### 6. Rewards

- `src/components/play/celebration.module.css`
- `src/components/play/celebration.tsx`
- `src/components/play/level-up.module.css`
- `src/components/play/level-up.tsx`
- `src/components/play/round-summary.module.css`
- `src/components/play/round-summary.test.ts`
- `src/components/play/round-summary.tsx`
- `src/lib/play/completion.ts`
- `src/lib/play/public.ts`
- `src/lib/play/summary-store.ts`
- `tests/e2e/play-game.spec.ts`
- `tests/play-game-stars.test.ts`

### 7. World map and sounds

- `src/app/play/page.tsx`
- `src/app/theme.css`
- `src/components/play/chest-node.tsx`
- `src/components/play/game-sounds.test.ts`
- `src/components/play/game-sounds.tsx`
- `src/components/play/level-up.tsx`
- `src/components/play/play.module.css`
- `src/components/play/topic-icon.tsx`
- `tests/e2e/play-game.spec.ts`

### 8. Compatibility

- `docs/play-pixel-design.md`
- `src/components/play/game-guide.tsx`
- `src/lib/play/catalog.test.ts`

### 9. Verification

- `docs/reviews/play-game-pixel.md`
- `src/components/play/celebration.module.css`
- `src/components/play/drill-card.tsx`
- `src/components/play/game-guide.module.css`
- `src/components/play/game-guide.tsx`
- `src/components/play/level-path.module.css`
- `src/components/play/pixel-style.test.ts`
- `src/components/play/pixel.module.css`
- `tests/e2e/capture-pixel.ts`
- `tests/e2e/play-game.spec.ts`
- `tests/e2e/play-pixel.spec.ts`
- `tests/e2e/play-round-one.spec.ts`

