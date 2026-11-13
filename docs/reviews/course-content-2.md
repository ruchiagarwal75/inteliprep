# Course content 2

Work stays on beta. QA uses isolated local fixture accounts, static grading and
stubbed providers. No live model calls, owner-account testing, secrets, environment
changes, Production deployment or main changes. Course fixes 5 stays deferred.

## 1. Compile the authored replacements

The strict versioned compiler reads the three supplied files. It requires ordered
question IDs, one Slide reference, four distinct options with one correct mark,
Key idea, Why and feedback for each wrong option. It rejects missing, duplicate,
unknown and out-of-range fields. Build verification fails on invalid source or a
compiled JSON artifact that differs from the source. Original wording stays intact.

The course schema can hold Q10 and ten questions. Topic 1 keeps its 13 slides and
has seven revised questions. Topic 2 has 13 slides and ten questions; Topic 3 has
12 slides and ten questions. Existing Q1 through Q7 IDs are retained. Slide links
come from the supplied references; the primer mapping remains unchanged.

Idle course rounds renew their clocks without replacing saved question snapshots
or options. New reviews look up the current version by the same question ID. The
compatibility test seeds a legacy seven-question round and verifies its snapshots,
answers, points and earned stars survive, while a due review uses the new content.

Content and compiler tests cover all three files and invalid source/artifact cases.
The length-cue counts are exactly 1/7, 0/10 and 2/10, with no warnings. Questions
and grading content stay in server-only modules; the public slide projection and
per-question API projection keep their existing boundaries.

## 2. Topic size, passing and path labels

The course accepts six through ten answers, retaining the 75% rounded-up rule.
Ten-question topics need eight correct. The existing star bands, 45-second star
time threshold, answer XP, combo rewards and first-attempt bonus are unchanged.
Topics 1, 2 and 3 show About 15 min; the primer remains About 8 min.

Rule tests cover each supported question count and ten-question star outcomes.
Actual Postgres tests complete both revised topics with 8/10 and 9/10. They check
unchanged answer and combo awards, and verify that a 7/10 attempt cannot revoke an
older pass, three stars, its pass date or historical points. No data migration is
needed.

## 3. Nine responsive vector diagrams

Topic 2 adds vectors/angle, bi-encoder lanes, HNSW layers, IVF clusters and filter
placement. Topic 3 adds hybrid merge, the revised three-column RRF example,
multi-query fan-out and a retrieval funnel. Each has a landscape layout capped at
200px on desktop and a separate portrait layout below 600px. Native Inter labels,
2px lines, square boxes, theme tokens and gold highlights match the existing course
illustrations. Every SVG has a title and its figure has a descriptive alternative.
The unused two-tower, ANN and RRF illustrations and their registry entries are removed.

The diagram browser test visits every Topic 2 and 3 slide at both target sizes and
in both themes. It checks overflow, desktop height, portrait orientation, Inter
labels of at least 13px, unclipped text, 3/6/12 HNSW nodes, two of six IVF clusters
scanned and the exact RRF lists. The existing slide/notebook diagram regression
also passes. Screenshots of all nine diagrams in both themes and sizes are in
`artifacts/course-content-2/T{2,3}-S*-{light,dark}-{1440,375}.png`.
