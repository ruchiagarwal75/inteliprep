# RAG primer implementation

## Content and storage

The primer is Topic 0. Existing topic numbers and saved attempt IDs stay unchanged.
A strict compiler reads the supplied Markdown. Quiz definitions remain server-only.
Level constraints expand to accept zero only for the RAG course. No progress rows
are rewritten, removed or backfilled.

Course prerequisites are explicit rather than inferred from path position.
Existing Topic 1 access will use persisted owner visits, sessions or open/passed
progress. A locked row is not proof of prior access. This avoids a redundant
per-player migration flag. All authorization remains on the server.

The primer uses the existing option shuffle, static grade, XP, stars and review
engine. No model calls are needed for implementation or QA.

## Changes by item

1. `metadata.ts`, `definition.ts`, `public.ts` and the slide routes support Topic 0.
   `parse-primer.mjs` compiles the supplied ten slides and eight question titles.
   The path starts with RAG basics and shows About 8 min.
2. `path-access.ts` defines prerequisites. `visits.ts` verifies saved access on the
   server. Existing Topic 1 players keep access without passing the primer.
   The path distinguishes unlocked topics from topics already read.
3. `play-primer-flow.test.ts` exercises the existing course rules against Postgres:
   six of eight passes, shuffled choices, XP, combos, stars, retries and reviews.
   A pass after a failed first attempt does not earn the first-try bonus.
4. `course-diagram-primer.tsx` supplies the S2, S7 and S8 vector diagrams.
   They use Inter, theme colors, square boxes and clear arrows. Narrow layouts
   keep labels readable instead of shrinking a wide diagram.
5. `rewards.ts` awards RAG Rookie through the existing unique badge record.
   `course-unlock.tsx` shows the brief path reveal after Continue. The server
   requires a saved primer pass. Reduced motion stops animation and scrolling.
6. `progress.ts` counts ten course topics and thirty possible stars, including
   Topic 0. Retired-world rewards do not enter the course banner.
7. Unit and browser tests cover fresh and returning accounts, slide readability,
   private content, badge retries, the quiz and the path reveal. Slide reads
   require an explicit level parameter so a missing value cannot become zero.

## Migration

`20261112233202_play_course_primer.sql` expands level constraints. It does not
renumber topics or update data. It accepts level zero only for `rag-course`.
It preserves all RLS policies and grants.

The migration was applied to the existing database. Checksums before and after
matched for sessions, attempts, level progress, reviews and course visits. All
five tables retain RLS, two policies each, server writes and no browser writes.
No additional migration step is needed for this Preview.

## Verification

Every item runs `npm run check` and `npm run build`. The build scans browser
chunks for private question content, answers, feedback and grading rules.
The final browser run uses the production build with isolated local Postgres,
auth fixtures and synthetic accounts. It makes no live model calls and does not
use the owner's account.

Functional QA stays local because the owner selected isolated local QA until a
separate Google Preview account is available. Preview deployment state is checked
after pushing `beta`. Production and `main` stay unchanged.

Local screenshots are in `artifacts/rag-primer/`: the first path node, S2, S7 and
S8 in both themes and widths, a quiz question, the result and World unlocked.
Screenshots remain untracked under the repository's artifact policy.

Final verification records 1,865 passing unit tests and two existing skips.
The full 45-case browser regression suite passed. Screenshot review then found
an overlapping unlock heading. The unlock card uses the inline mascot layout,
with a focused check that the speech bubble stays below its heading. The path
hides its second guide during the reveal. The result capture waits for XP to
finish counting so the screenshot shows the saved total.

The final three focused browser checks pass after the visual correction. They
cover all ten slides in both themes at 1440 by 669 and 375 pixels wide, the full
primer pass and reveal, and optional access for a returning player. The full
check and production build also pass after that correction. Test fixture servers
and browsers are closed after verification.
