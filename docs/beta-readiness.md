# Beta readiness verification

## Priority 1

1. Configured opening questions: `711d3f5`. All eight problems at all three
   levels use their own closing question; rubric content stays server-only.
2. Early-ending warning: `7c4fb4c`. The scorer and UI share the one-third time
   threshold and two-stage rule. A 45-minute session needs 15 minutes; an hour
   needs 20. Keep going is primary below the time gate.
3. Skip ineligible grading: `3626a9e`. The server returns a neutral result
   without calling the provider. Reporting records the reason without changing
   completion status. The full check passed with 1,233 tests, and build passed.
4. Whiteboard: **not reproduced** on the current production build. A 300 by
   150 CSS-pixel drag produces a 300 by 150 scene rectangle at both 1280 by 800
   and 1920 by 1080, at native Chrome zoom 90%, 100% and 110%. Redis cache stays
   on one or two lines. The regression uses a temporary persistent Chrome
   profile and Chrome's own zoom selector, not CSS zoom, DPR emulation or pinch
   scaling. Eleven browser checks passed. No app-side scale workaround was
   added. No failing revision was identified to mark as bad in git bisect, so
   an offending commit cannot responsibly be identified from this reproduction.
5. Feedback: already implemented and shipped separately in `4a76800`.
   The local production browser checks submit and skip feedback, confirm its
   user/interview linkage in the admin page, and deny non-admin access. Existing
   history remains untouched.
6. Legal pages: already implemented. `/privacy`, `/terms` and `/sign-in` return
   200 on Production; both policy links appear on sign-in and in the footer.
   The privacy notice describes storage, OpenAI processing and deletion.

### Google console checklist for the owner

These settings cannot be established from repository code or a signed-out page.
No console settings or environment variables were changed for this work.

1. In the Google Cloud project that owns the OAuth client, open Google Auth
   Platform, then Branding.
2. Set the app name to MockMeAI and choose a support email you monitor.
3. Upload the existing square logo, `src/app/apple-icon.png`.
4. Add `mockmeai.com` to authorized domains. Keep the required Supabase domain
   and the existing OAuth callback URI.
5. Set homepage to `https://mockmeai.com`, privacy policy to
   `https://mockmeai.com/privacy`, and terms to `https://mockmeai.com/terms`.
6. Save, finish Google's verification if requested, and test a fresh Google
   sign-in to check the displayed name and logo.

More detail: [authentication setup](authentication.md#google-console-rebrand-checklist-operator-action).

## Beta funnel definitions

`/admin/funnel` shows seven milestones for an inclusive UTC date range, with
search, pagination, per-user counts and the existing admin/test exclusion.
Top counts are distinct users reaching each step in the period, not a signup
cohort. Per-user rows count persisted occurrences. The second-interview step
uses the user's second recorded eligible start across history, then applies
the selected date range to that milestone.

Starts, completions, non-skipped feedback and second starts reuse the existing
interview and feedback tables. Only sign-in sessions, verified scoring eligibility
and scorecard opens add events. Sign-in events use a hash of the verified Auth
session ID, never an access token. Eligibility uses server timing and answered
stages on the next meaningful server action. Viewing the scorecard is counted
only when an assessed card is actually visible; a too-short result is excluded.
Retries and refreshes use unique milestone keys. Tracking failure cannot block
the interview. Historical values for the three new milestones are unavailable;
the dashboard shows when their recording began.

## Priority 2: real-model verification

These are synthetic conversations run locally through `streamInterviewerReply`
against the configured `gpt-6.1-terra` provider, not browser-fixture replies.
Rubrics, workload values and scoring weights remain unchanged.

### 8. Candidate estimation at Senior and Staff

Prompt-only change in `src/lib/interview-instructions.ts`, with level-specific
regression tests. Mid receives the same guidance as before.

Candidate: “What QPS should I design for, and can you explain the arithmetic?”

Before, Senior: “A day has 86,400 seconds, so that’s about 12 create requests per
second and 1,157 redirects per second on average. Design for peaks up to 10 times
the average: roughly 116 creates and 11,574 redirects per second.”

After, Senior: “Assume 1 million new links and 100 million redirects per day, with
peak traffic up to ten times the daily average. Use those inputs to estimate
average and peak QPS for each workflow, and explain your assumptions.”

Staff likewise supplies 10 million links/day, 1 billion redirects/day and the
10x peak factor without doing the arithmetic. Mid still provides its worked
estimate when asked. Each level was exercised against the real model.

### 9. Natural diagram discussion

Removed the server-added inventory from `llm.ts` and its unused helper. The
shared and structured discussion prompts now ask about one consequential path
or risk, referring to diagram names naturally. Explicit “what can you see?”
requests still receive a factual readback.

Before, file storage: “I see a component labeled \"metadata DB\" and a component
labeled \"object storage\" on your diagram. If the upload API stops after writing
the bytes to object storage but before updating the metadata DB, what happens
when the client retries completion?”

After: “If the upload API stops after the bytes reach object storage but before
publication in metadata DB, what happens when the client retries completion?”

Three real-model runs (URL shortener, notifications, file storage) all asked
one specific question and never listed components. The other two asked about
immediate Cassandra reads and duplicate jobs entering the queue.

### 10. Resume questions without verbatim repetition

The structured response identifies the pending question it continues. The server
verifies that identity, rejects repeated wording, retains its queue entry rather
than adding a duplicate, and preserves a short evidence-backed acknowledgement.
Side-question paths also use a nonrepeating continuation. Invalid generations
get a topic-specific walkthrough instruction without another paid model call.

A real-model test exposed another cause of dropped acknowledgements: the model
returned a candidate quote ID where the old validator expected literal text.
The server now resolves only IDs belonging to the latest verified candidate
message; arbitrary or older IDs cannot support an acknowledgement.

Candidate detour: “The Redis cache will use a five-minute TTL so popular redirects
avoid Cassandra reads.”

Before: “How would you allocate distinct counter values in your Cassandra-based
design?” This was identical to the outstanding question, with no acknowledgement.

After: “The Redis cache reduces repeated reads. When two API instances create
links concurrently, what prevents them from receiving the same counter value?”

### 11. End clarification replies with a clear question

The server now adds a conversational clarification prompt when a factual answer
has no question. It counts facts supplied in the same reply as shared context,
so it does not quiz them again. It avoids repeating the immediately preceding
clarification prompt. Drawing handoffs, drawing/explaining silence and neutral
off-topic redirects retain their own behavior. The old “Please review your
requirements and choose Start drawing” fallback is removed.

Before: “Yes. Once creation succeeds, the short link must be immediately usable
and redirect to its saved original URL. You can describe this as a read-after-write
guarantee for the link mapping.” There was no next ask.

After: “Yes. Once creation is acknowledged, the short link must be immediately
usable and redirect visitors to its saved original URL. This guarantee applies to
the core link mapping, not optional analytics. Any other requirements you'd like
to check?”

Five scripted factual turns were exercised against the real model. All five now
end with a question, without the old UI instruction. The configured fast path is
also covered: an advanced candidate asking “What QPS should I design for?” gets
the configured daily inputs followed by a request to estimate, not arithmetic.

## Changes and validation by item

Each changed item has its own commit. Items 5 and 6 were already shipped and were
verified without an empty commit. No saved interviews were deleted or migrated.
No secrets or Vercel environment settings were changed.

| Item | Main files | Commit |
| --- | --- | --- |
| 1 | `chat-display.ts`, `problems.ts`, `configured-clarifications.ts`, opening/display tests | [711d3f5](https://github.com/ruchiagarwal75/inteliprep/commit/711d3f567749174754014bb6ef638f4945846b30) |
| 2 | `scoring-eligibility.ts`, `scorecard-calibration.ts`, End confirmation/timer/header components and tests | [7c4fb4c](https://github.com/ruchiagarwal75/inteliprep/commit/7c4fb4cc2183f4ec7b81276fe39befcdee73c539) |
| 3 | `short-interview-scorecard.ts`, `interview-grading.ts`, `end-interview.ts`, `interview-tracking.ts`, short-result/admin components, additive scoring migration and tests | [3626a9e](https://github.com/ruchiagarwal75/inteliprep/commit/3626a9e47940dc67b4708330f350055b3af3145b) |
| 4 | `tests/e2e/whiteboard.spec.ts`, `tests/e2e/fixture-auth.ts`, this report | [52be646](https://github.com/ruchiagarwal75/inteliprep/commit/52be64601f19ecf5e6aed9ce4ab005b6ab9584eb) |
| 5, 6 | Existing feedback API, migration, admin UI, privacy/terms pages and auth documentation | Already shipped; verified |
| 7 | `admin-beta-funnel.ts`, `beta-funnel-query.ts`, `beta-funnel-tracking.ts`, admin funnel page/API/panel, scorecard-view API/tracker, auth/reporting hooks, additive funnel migration, privacy/admin docs, database and browser tests | [6bbd93d](https://github.com/ruchiagarwal75/inteliprep/commit/6bbd93dac09916b830e91772762069d8a5ebcc2b) |
| 8 | `interview-instructions.ts` and its tests | [7524758](https://github.com/ruchiagarwal75/inteliprep/commit/7524758aca9600528bbdb6ba355baf4723f840a9) |
| 9 | `llm.ts`, `discussion-reply.ts`, `interviewer-input.ts`, pending diagram helper and tests | [a698308](https://github.com/ruchiagarwal75/inteliprep/commit/a698308a1b2f7e7f8ca31c09e66c1f2a745d2442) |
| 10 | `discussion-reply.ts`, `discussion-acknowledgement.ts`, `pending-question-reply.ts`, turn/session/context wiring and tests | [1d08d11](https://github.com/ruchiagarwal75/inteliprep/commit/1d08d115fb446911683faad6c0c731dc76731740) |
| 11 | `clarification-continuation.ts`, `llm.ts`, clarification tests and this report | This commit |

`npm run check` and `npm run build` pass for each changed item. Priority 1 also
passed 12 production-browser checks and two opt-in live database transaction
tests. The latter roll back only their synthetic fixtures. The whiteboard check
covers six viewport/zoom combinations; its measurements and screenshots remain
in ignored local artifacts rather than git. The unrelated security-review
markdown file is left untouched.
