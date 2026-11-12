# Play game polish, round 3

Scope: `docs/play-content/game-polish-round-3.md`. Beta only. Mock scoring,
problem content, original mascot artwork and the whiteboard are unchanged.
Verification uses stubbed model replies, with no paid model calls.

## Changes by item

1. `world-banner.tsx`, its CSS Module, the topic page and theme tokens: a violet
   RAG World banner with server progress, stars and the original mascot. The
   All topics back link stays above it. Banner contrast is checked in both themes.
2. `level-path.tsx` and its module: real level titles under each node, with the
   level number smaller above the title.
3. Path captions have opaque, world-background pills. Extra vertical space fits
   titles, stars and chests without collisions.
4. Desktop path width grows from 600 to 900 pixels. Nodes grow from 88 to 106
   pixels, or 96 to 116 for the current level. Faint rings and dots fill the sides.
   Mobile node dimensions and horizontal positions are unchanged. The extra
   vertical room from item 3 is needed for the visible names and stars.
5. `20261112060643_play_legacy_stars.sql`, migration tests and the browser fixture:
   legacy passes get one star for a saved best score of at least 0.8 and two for
   1. Existing stars never decrease. No time-based third star is backfilled.
   Modern placement passes retain zero stars. Reapplying the migration is safe.
6. `lesson-header.tsx`, its module and tests: the combo chip appears at two or
   more. Theme, close and progress controls remain available.
7. `drill-card.tsx` and its module: the graded question card shrinks to its
   content and has a thin world-colored top edge. Bottom-sheet clearance belongs
   to the page, so it does not create an empty gray card.
8. `level-up.tsx`, its module, provider and tests: world burst, large level badge,
   short confetti and the next XP target supplied by the server. Reduced motion
   hides confetti and removes the entry animations. Original mascot art is reused.
9. Play topic page, `topic-icon.tsx`, `play.module.css` and browser tests: each
   world gets an icon and its color. RAG shows stars, cleared levels and a progress
   bar. Coming-soon worlds remain visible with muted versions of their colors.

## Data verification

The migration only raises `best_stars` for qualifying legacy progress. It does not
change scores, attempts, answers, XP, pass times, unlocks or stored round results.
The hosted backfill was applied with `npm run db:play` and verified with
`npm run db:play -- --verify`. Before-and-after checksums matched for rounds,
attempts, the ledger and all progress fields other than stars. Existing RLS and
the restricted runtime role are unchanged.

## Checks and browser coverage

Run `npm run check` and `npm run build` after each numbered commit. The full
stubbed `npm run test:e2e` suite covers the new visuals and the existing interview,
access, feedback, theme and whiteboard regressions. The Play story also checks
world progress, desktop/mobile node dimensions, label/chest separation, hidden
zero/one combos, compact answer cards, next-level XP and reduced-motion confetti.

Requested screenshots are generated at 1440 and 375 pixels in the ignored
`artifacts/play-game-polish-round-3/` directory. The gallery includes the RAG
banner, full light and dark paths, open feedback, player level-up and topic map.
Screenshot files stay out of Git.
