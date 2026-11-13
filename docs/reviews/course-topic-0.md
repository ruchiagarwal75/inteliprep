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
