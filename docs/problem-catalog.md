# Interview problem catalog

The eight core exercises support Mid-level, Senior, and Staff. The picker reads the
server registry automatically. Each problem owns its opening, requirements,
clarifications, five stages, private rubric, and follow-up bank. Starting an
interview does not call a model. The default remains Scale a single server.

| Problem | Core exercise | Main design skills |
| --- | --- | --- |
| Scale a single server | Improve a small website incrementally | Bottleneck evidence, request paths, validation |
| Design a URL shortener | Create public links and redirect visitors | Identifiers, durable mappings, hot reads |
| Design a rate limiter | Enforce a per-key rolling-window quota | Concurrent decisions, bounded state, protective failure behavior |
| Design a chat service | Private one-to-one text messaging and history | Durable acceptance, ordering, retries, delivery and reconnects |
| Design a news feed | Chronological posts from followed accounts | Feed construction, stable pagination, skew, freshness and deletion |
| Design a notification system | Transactional email and mobile push | Durable acceptance, preferences, provider uncertainty, bounded retries |
| Design a file storage service | Private file transfer and read grants | Resumable uploads, complete publication, versions, access and cleanup |
| Design a video streaming service | On-demand upload and playback | Processing state, complete publication, seekable delivery and cost |

## New exercise boundaries

Rate limiter: allow at most 100 requests per trusted API key in any rolling
60 seconds. Rejections do not consume quota. Quota exhaustion returns HTTP 429;
unavailable enforcement protects the downstream API with temporary unavailability.
The p95 overhead goal is below 10 ms. Peak load is 1,000 / 10,000 / 100,000 checks
per second at Mid / Senior / Staff. A fixed calendar-minute counter or silently
allowing all requests during an outage does not satisfy the default requirements.

Chat: identity exists, and only conversation participants may read or send.
A successful send acknowledges durable acceptance, not delivery or reading.
Target p95 acceptance below 200 ms and online delivery below 1 second during
normal operation. Retain history for 90 days. Per-conversation order must be
stable; logical retries must not create another stored message. Transport
redelivery can occur when clients suppress duplicate display. Daily message
volume is 1 million / 100 million / 1 billion at Mid / Senior / Staff. Group
chat, media, read receipts, and end-to-end encryption are optional extensions.

News feed: public text posts, newest first, with existing identity and following
data. Target p95 feed reads below 500 ms and new-post propagation within 5 seconds
during normal operation. Successful publishing is durable and available to the
author by ID. Default to 90-day retention and deletion from new feed responses
within 60 seconds. Accept justified retention alternatives and stricter deletion
bounds, and keep those agreed values. Pagination must remain stable when posts arrive.
Daily feed reads are 1 million / 100 million / 1 billion at Mid / Senior / Staff.
Ranking, private accounts, ads, media, and reactions are optional extensions.

All three keep a single-region core. Difficulty changes load and expected
reasoning depth, rather than requiring unrelated features. Strong answers may
use different architectures when they meet the agreed requirements.

The default application-to-database diagram probe remains for the two original
exercises. The new configs disable it through
`diagramReview.checkApplicationDataPaths`: a limiter, delivery worker, or derived
feed reader need not connect to the same database as every other API component.
The model still receives the complete diagram and rubric. Mentioned-but-unlabeled
cache/CDN probes and candidate drawing/explanation pauses still apply.

## Additional practice set

Notifications, file storage (Dropbox-style), and on-demand video (YouTube-style)
are represented in [Hello Interview's common practice catalog](https://www.hellointerview.com/practice/system-design).
This is a practical selection, not a measured frequency ranking. The configurations,
exercise numbers, prompts, and review examples here are original product choices.

Notifications: one recipient, email/push or both, per-channel status, and current
preferences. Submission success means durable acceptance, not external delivery.
Target p95 submission below 200 ms and first dispatch within 30 seconds with
healthy providers. Defaults are a 24-hour retry window and 30-day status retention.
Logical requests per day are 1 million / 100 million / 1 billion at Mid / Senior /
Staff, with ten-times peak load and up to two initial channel attempts. Provider
timeouts may leave uncertain outcomes; an exactly-once external guarantee is not
required. Bulk marketing, scheduling, and SMS are optional extensions.

File storage: private upload/list/download/replace/delete with explicit read grants.
Support resumable files up to 1 GB, averaging 10 MB. Only complete durable bytes
and matching metadata become visible; a stale replacement must not silently erase
another version. Defaults are 7-day old-version retention, 24-hour abandoned-upload
cleanup, and revocation blocking new downloads within 60 seconds. Target p95
metadata below 200 ms and first byte below 1 second, rather than a whole-file
transfer deadline. Daily uploads/downloads are 100,000 / 1 million at Mid,
10 million / 100 million at Senior, and 100 million / 1 billion at Staff. Automatic
folder sync and collaborative editing remain extensions.

Video: on-demand public playback and seeking, with creator upload/status. Sources
are at most 2 GB / 30 minutes; estimates use 250 MB and 10-minute averages, 5-minute
watch time, and 3 Mbps delivered bitrate. Upload success is durable source acceptance,
while readiness requires complete usable playback outputs. Target p95 playback
start below 2 seconds for healthy regional clients, and 99% readiness within
10 minutes of completed upload in normal operation. Daily uploads / peak concurrent
viewers are 1,000 / 10,000 at Mid, 100,000 / 1 million at Senior, and 1 million /
10 million at Staff. Default deletion blocks new playback within 60 seconds;
buffered bytes cannot be recalled. Live streaming, ranking, subscriptions, and DRM
remain extensions.

All three supply scope and correctness defaults in the opening. Only missing
workload/goals hold up the drawing handoff. Numeric targets are fixed exercise
goals unless marked as defaults; allowed alternatives require an explicit response.
These new exercises have synthetic full-flow coverage at all three levels. Bounded
Mid-level live checks also returned an interviewer follow-up and a schema-valid,
evidence-backed scorecard for each exercise. Complete browser interviews and the
Ticket 05 evaluation/calibration suite remain required before beta onboarding.
The live checks reproduced known grading wording problems: notification feedback
claimed a concrete test plan was missing despite a provider-outage load test, and
video feedback claimed variable bandwidth was unaddressed despite lower-bitrate
selection. Successful responses establish wiring, not calibrated feedback quality.

## Review inputs and verification

`src/lib/fixtures/problem-reviews/` contains one synthetic transcript script and
bound diagram per new question. Each includes clarification questions, a
requirements confirmation, core and failure explanations, rubric evidence
anchors, and a deliberately weak answer with specific review concerns. These
are example inputs, not a required architecture or an exhaustive answer key.

`tests/problem-catalog-interviews.test.ts` runs all six added questions at all
three levels through start, clarification, drawing/explanation pauses, explicit
discussion, stage completion, end, and cached scorecards. It also verifies that
an unexplained drawing cannot earn invented scores. Provider responses are
scripted; this verifies application wiring and evidence validation, not actual
model quality or the strength of an answer at every level.

Run `npm run check` for schema, catalog privacy, clarification, diagram, prompt,
and interview-flow checks. Before onboarding beta users, complete real-model
evaluations from Ticket 05 and manually review a complete interview for each new
problem. Review score ranges and the weak-answer cases with those evaluations;
the problem-expansion ticket is not release-complete until those checks pass.

## Manual review progress

2026-11-03: a partial browser review of Design a chat service confirmed the
opening and one-to-one scope, answers to a combined workload/latency/ordering/
duplicates/retention clarification, drawing and saving, and the Change problem
confirmation. An unrelated negative sentence in the configured chat clarification
was removed at all three levels and covered by a regression test.

The first review stopped when model API access failed with `expired_secret_key`.
Provider failures now remain on the interview page with a recoverable pending
turn; the reviewer confirmed the corrected error handling.

After renewing the model key, the reviewer completed all three new problems,
including real interviewer replies and scorecards. Rate limiter and chat service
worked well. News feed repeatedly asked for publishing, retention, and deletion
requirements, reset proposed values, and overlooked a numeric popular-creator
example in feedback. The local fixes put those defaults in the opening, accept
reasonable alternatives, recognize the numeric evidence, and cover stage flow
with regression tests. The news-feed conversation still needs a fresh manual
review before marking catalog review complete. Smaller findings covered here
include duplicate rate-limit policy text, an unasked Yes, repeated catch-up
probes, and evidence sentences split at abbreviations.

Saved interviews whose checkpoints cannot be read after configuration changes
can now be closed without scoring. Their browser transcript, drawing, and draft
remain available; permanent failures no longer offer an impossible reply retry.

2026-11-05: all 761 automated checks pass. Three focused live-model checks accepted
one-year retention with deletion within a few seconds, moved from an answered
offline-catch-up question to participant authorization, and cited the numeric
50k-follower example in grading. These are bounded probes, not full browser
interviews. The grading probe still produced an overly broad gap about missing
justification despite citing a read/write tradeoff. Include that contradiction
in Ticket 05 calibration; numeric topic recognition alone does not establish
consistent feedback quality.

A subsequent complete browser review confirmed that news feed no longer loops,
builds each probe on the previous answer, and credits the popular-creator example
with a first-attempt scorecard. A proposed one-year retention was still swallowed
by drawing/explanation listening because it was a statement rather than a question.
Requirement proposals now bypass that quiet path and receive an explicit response;
ordinary narration keeps the candidate's floor. The local startup trace also showed
first-use route compilation dominating handler time. A development-only background
OPTIONS request prepares that route without starting or saving an interview.

The notification, file-storage, and video-streaming browser review completed all
three interviews with first-attempt scorecards and no console errors. It uncovered
multi-question Markdown replies, repeated guarantees, missed clarification parts,
and requirements/concurrency evidence being overlooked. Follow-up fixes use
topic-specific notification answers (including an explicit channel mix), concurrent
file replacement facts distinct from live collaboration, and an explicit unspecified
rebuffering target. Grading receives trusted scope and recognizes clarification
questions and compare-and-set evidence. Justified one-year retention proposals
receive a visible acknowledgement and remain eligible requirements evidence.

Discussion probes now seed coverage from earlier explanations and check a proposed
question against exact candidate quotes before showing it. Replacement questions
are checked too. A focused live file-storage check moved from already-explained
partial-upload visibility to an unresolved sharing/revocation case. Live scorecards
credited notification timing questions, version-conflict handling, and the accepted
retention alternative. Wider score calibration remains Ticket 05 work.

The observed eight-second browser startup was not reproduced in handler timings.
New-session replacement now avoids an intermediate workspace and full-history scans
after saves. Tests verify a single fresh workspace, preservation on request failure,
and blocking when old saves fail; development timing logs isolate preparation,
request, and save time for the next browser measurement.

A subsequent browser retest verified all eight fixes, including startup at about
0.3 seconds, with first-attempt scorecards and no console errors. New findings were
a repeated generic fallback after rejected probes, a topic jump after a revocation
answer, repeated news-feed goals, and an unexplained disabled explanation button.
The local fixes select specific unasked probes, prioritize named topics and the
current answer thread, and acknowledge technical answers. News-feed setup recognizes
numeric shorthand and equivalent time units. The empty-board button now has a
visible hint. Route-to-stream regression tests cover fallback exhaustion, topic
selection, and the requirements handoff; these changes await a fresh browser retest.


## AI / GenAI application design

The GenAI group reuses the same five-stage interview engine. The enterprise RAG
assistant covers the supplied internal-document scenario, citations and user
permissions. The AI chat assistant adds streaming conversations, token/provider
limits at Mid, and token/GPU capacity, tier routing and overload at Senior/Staff.
The tool-using agent covers bounded execution, delegated permissions, approval,
idempotency, recovery and evaluation with mocked tools. Its math is secondary to
correctness and safety. Table facts are disclosed for every requested row in the message; estimate
anchors and expected designs are private. Representation sizes not specified in
the facts remain candidate assumptions.

Each GenAI problem has seven independent 1–4 areas, including Evaluation and
quality and Safety and security, with cost in its own problem-specific area.
There are no numerical weights or weighted total. The eight core configurations
and their five areas are unchanged.

Real-provider evaluations are explicitly opt-in and incur cost:

```sh
node --env-file=.env.local node_modules/vitest/vitest.mjs run --config vitest.genai.config.mts
```

They use synthetic transcripts and diagrams, do not create account/interview
reporting records, and write local results under ignored `artifacts/genai/`.
Normal checks and CI use no paid model calls.
