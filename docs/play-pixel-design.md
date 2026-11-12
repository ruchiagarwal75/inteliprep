# Play pixel accents

Only Play's presentation changes. The existing server owns grading, stars, XP,
chests, streaks and unlocks. Mock content and original non-Play mascot art stay
unchanged. The existing light default and saved theme preference are preserved.

Inter is self-hosted for reading and navigation. Press Start 2P is self-hosted
only for short labels at 9 pixels or larger. Font sources, hashes and SIL Open
Font Licenses live in `public/fonts/play`; `verify-play-fonts.mjs` checks them.

`pixel.module.css` scopes the night-sky and lavender palettes to Play. Explicit
game-label attributes identify pixel text. Long copy and names stay in Inter.
Sprites will be generated from the supplied character grids into crisp SVG
rectangle runs. The source grids are the artwork, with palette colors in theme
tokens. Original UI geometry and animation live in scoped modules.

Segmented bars only display server values. Ordinary level rounds have five
blocks. Placement retains its actual six questions and six blocks. XP bars have
ten blocks. The next player threshold comes from the server's existing curve;
the example 400 XP does not replace that curve.

The existing legacy-star migration and hidden zero/one combos are retained and
verified rather than reimplemented. No new reward storage or migrations are
needed. Tests use local model stubs and preserve existing saved attempts.

## Carried-over behavior

The four level names still come from the server-only topic catalog. New and old
round summaries now include the public display title without rewriting old rows.
Names on the path, popovers and completion screen use Inter.

`20261112060643_play_legacy_stars.sql` already backfills passed levels from
saved `best_score`: 4/5 earns one star, 5/5 earns two. It never invents a time
star. It is idempotent and keeps existing stars, attempts and points. No new
migration is needed for this redesign. The migration regression runs against
an old database twice; game-star tests verify retries never duplicate rewards.

Zero and one combos remain hidden. The lesson progress now retains each stored
correct or wrong outcome, including all six placement drills. These are display
changes only. Topic readiness and mock scoring remain unchanged.
