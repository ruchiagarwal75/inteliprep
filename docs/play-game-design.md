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
not gain invented timing or stars. New best stars can only increase.

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
