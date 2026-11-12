# Play game redesign verification

Scope: `docs/play-content/game-redesign.md`, beta preview only. Mock content,
interview scoring, original mascot artwork and the whiteboard are unchanged.
All model responses in verification are stubs. No paid model calls were made.

## Changes by section

1. `theme.css`, `game.module.css`, `play-frame.tsx`: world colors, reward tokens,
   pressed buttons and reduced-motion support. Logo and main nav retain teal.
2. `level-path.tsx` and its module: winding path, native keyboard-operable node
   popovers, locked/current/passed states and Skip ahead.
3. `game-rules.ts`, `completion.ts`, `submit.ts`, `rounds.ts`, `player.ts`:
   server stars, par times, best-star persistence and half-rate replay XP.
4. `chests.ts`, `/api/play/chest`, `chest-node.tsx`: three one-time seeded RAG
   chests, transactional XP grants and duplicate-open protection.
5. `game-hud.tsx`, `level-up.tsx`, `play-rewards.tsx`, `totals.ts`: streak, Daily
   ring, XP and server-derived player levels, with a native level-up dialog.
6. `lesson-header.tsx`, `drill-card.tsx`, `drill-answer-form.tsx`,
   `answer-sheet.tsx`, `game-sounds.tsx`: focused lesson, sticky Check, correct
   and wrong sheets, thinking pose, combos and optional original tones.
7. `round-summary.tsx`, `counted-xp.tsx`, `round-summary.module.css`: stars,
   accuracy, answer time, best combo, badge reveal, retry and next-node reveal.
8. `game-guide.tsx` and its module: idle, cheer, encourage, thinking and
   celebrate wrappers around the existing SVG assets. No character redraw.
9. `migrate-play.mjs`, SQL migrations, migration fixtures and tests: additive
   schema rollout, RLS and old-record checks. UI calls the ledger balance XP;
   persisted `points` names remain compatible.
10. `tests/e2e/play-game.spec.ts`, existing Play smoke tests and helpers: new
    game-state captures and regressions, plus visual fixes for feedback scroll,
    chest lid, first-paint lesson navigation and focus after level-up.

## Reward definitions

- Par times: 45 seconds for multiple choice, 90 for math, 120 for written.
  The server measures time through answer submission, excluding grading.
- Four correct answers out of five earn one star, five earn two, and five
  within every par time earn three. Best stars never decrease.
- Placement has two questions per level, so it opens levels without stars.
  Existing rounds do not receive invented stars or timing data.
- Replay XP is half the drill rate, rounded down: 10 becomes 5, 15 becomes 7,
  and 20 becomes 10. The server fixes replay status when the round starts.
- Three consecutive correct answers earn 5 extra XP; five earn 10. A wrong
  answer resets the combo. Ledger references prevent duplicate grants.
- Each chest grants 20 to 50 XP from a seed tied to its user and location.
  Retrying an open returns the same prize and balance.
- Player levels use cumulative thresholds: Lv 1 at 0, Lv 2 at 100, Lv 3 at
  300, Lv 4 at 600. Advancing from level n costs 100 times n XP.

The latest multi-color section 1 takes precedence over section 6's older teal
selection wording. RAG's selected answers and primary lesson buttons use violet.
The XP pop stays in the answer sheet because lesson mode hides the normal HUD.

## Database rollout

Applied and verified with the existing operator command, without env changes:

```sh
npm run db:play
npm run db:play -- --verify
```

Additions:

- `20261112041345_play_stars_replays.sql`
- `20261112042654_play_chests.sql`
- `20261112044418_play_combos.sql`

These add stars, replay/combo fields and chest records. They do not replace
existing policies or delete old data. Verification checks all 12 private tables,
owner RLS, browser reward-write restrictions and the restricted runtime role.
The legacy-schema test applies all additions twice and preserves old attempts,
results, progress and ledger entries.

## Verification and screenshots

`npm run check` and `npm run build` run after each section commit. The checks
include TypeScript, lint, formatting, SQL integration tests, palette contrast,
game rules and private-content browser-bundle scans.

The full `npm run test:e2e` suite runs a production build against isolated Auth,
Postgres and model fixtures. It does not contact the live AI provider or use
real saved interviews. New coverage includes reduced motion, path states,
correct/wrong sheets, Checking, three-star completion, failure/retry, a chest,
idempotent opening and player level-up. Existing placement, readiness, keyboard,
flame, startup-request and account-isolation checks remain covered.

Screenshots are generated at 1440 and 375 pixels in the intentionally ignored
`artifacts/play-game-redesign/` folder. `index.html` links all ten requested
states in both sizes. Extra dark-theme path captures live there too. Screenshot
files stay out of Git.
