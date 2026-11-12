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
