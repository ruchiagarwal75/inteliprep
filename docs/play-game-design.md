# Play game redesign

The current Play API, player lock and points ledger remain authoritative. The
client sends answers or a chest ID, never XP, stars, combo counts or a level.
Mock grading and content remain unchanged.

## World colors

RAG uses violet. Chat and serving uses sky blue, Agents coral and Final Loop
gold. The logo and primary mode navigation keep brand teal. XP is gold, chests
pink, correct answers green and wrong answers soft red. Palette tests check
text and foreground icons in both themes.

## Ownership and flow

Pure server rules own par times, stars, replay XP, combos, seeded chests and the
player level curve. Transactional commands consume saved attempts and append
unique ledger references. Public schemas project outcomes for the HUD and UI.
The runner renders those outcomes and keeps presentation state only.

Schema additions ship with the feature that needs them. Section 9 verifies the
combined schema, RLS and old-record compatibility. Only columns, tables and
indexes are added. Existing attempts keep their saved variants and results.

Replay drills earn half their normal XP, rounded down to whole XP. A replay is
decided by the server at round creation. Reviews of already-cleared levels also
use the replay rate. First-try level bonuses remain one-time rewards.

Player Lv 1 starts at zero XP. Reaching the next level costs 100 times the
current level: Lv 2 at 100 total, Lv 3 at 300, Lv 4 at 600. The server returns
level and progress from the existing ledger sum.

Placement can pass and open levels, but earns no stars because it has only two
questions per level. Stars require a five-drill level round. Old saved rounds do
not gain invented timing or stars. Legacy level progress with no star-era pass
gets one star for a saved best score of 0.8 and two for 1. No time star is
backfilled. Modern placement passes still earn no stars. New best stars can only increase.

There are three RAG chests, one between each pair of levels. The prior pass
unlocks the chest; opening it does not block the next level. The server hashes
the verified user and configured chest ID to choose 20 to 50 XP. One transaction
records the chest and unique ledger entry, so retries return the original prize.

## Alternatives

A separate XP balance would drift from the points ledger during retries. Keep
the ledger and rename its presentation to XP. A browser timer cannot prove par
time, so stars use the server's saved time to submission, excluding grading.

## Verification

Use isolated SQL/RLS fixtures and stubbed model replies. Do not run paid model
calls for this redesign. Capture all requested screens at 1440 and 375 pixels.

## Mascot poses

The original mascotArt.ts, Mascot.tsx and mascot.css are unchanged. Play uses
five wrappers around those exact SVGs: idle uses a still wave, cheer uses done
with a short arm lift, encourage uses wave with a gentle nod, thinking uses the
working laptop with three thought dots, and celebrate uses done with a short
jump. Original colors, glasses, hair, clips and hoodie remain intact. Play hides
the SVG's built-in bubble when it supplies its own guide copy; Home's hi! bubble
is untouched. Mobile hides the path guide. Motion pauses in hidden tabs and is
removed with reduced motion. The existing Show mascot preference applies here.

## Additive rollout and compatibility

Run `npm run db:play` with the existing operator connection. It applies the base
schema only for a new database, then the three additive game migrations. Run
`npm run db:play -- --verify` to check the new columns, all 12 private tables,
RLS, browser write restrictions and the restricted runtime role. Existing schema
policies are not replaced. Applying the additions twice is safe.

The additions are best_stars on level_progress, replay/current_combo/best_combo
on play_sessions and chest_opens with its own owner policies. Existing variants,
answers, start times, scorecards and ledger entries are untouched. Old summaries
keep optional stats unavailable. The old internal points field and ledger table
name remain compatible; UI copy calls the same balance XP.

The browser can read its own public outcomes. Only server commands write stars,
chests, combos or XP, under the per-player lock. Points, correct flags and reward
seeds are rejected in client request schemas. Database tests exercise old rows,
repeated migrations, concurrent opens and duplicate submissions.

## Course Learn focus shell

Course Learn pages hide the site header and HUD, as the quiz does. A viewport grid
keeps the exit, topic title, slide segments, unlocked quiz action and theme toggle
at the top, with Back and Next/Start quiz at the bottom. Only the card scrolls.
The card starts at its top on every slide, with a 24px fade while more remains.
Arrow keys and Enter navigate; Escape returns to the path. Review dialogs keep
their own reader and close action. Reading and quiz access rules stay on the server.
