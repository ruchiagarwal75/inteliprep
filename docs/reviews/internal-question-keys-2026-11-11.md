# Private question keys

Probe, topic, fact and assumption keys use the reserved `mmq7-` namespace.
Generated discussion questions keep their existing `fresh:<hash>` format.
Ordinary design language, including cold-start, position-bias and user_id, is
public text and must not trigger the identifier filter.

Use human question text to write prompts. Never turn a key into a sentence.
The public stream checks each sentence before publishing it. When removing an
identifier also removes the question, it makes one repair call grounded in the
candidate's answers, drawing and pending question. It does not substitute a canned
question.

`normalizeQuestionKeys` maps old saved metadata when reading encrypted
checkpoints, Redis records and process-local sessions. It preserves transcript
text, timing, drawings and scorecards. Browser saves retain their original opaque
checkpoint until the server reads it. No stored interviews are deleted or bulk
rewritten. Duplicate old and new counter aliases use the larger count, not their
sum.

`node scripts/namespace-question-keys.mjs` is an idempotent conversion for checked-in
config and fixture key fields. Regex matching patterns, facts and rubrics stay
unchanged. Stubbed tests cover sentence streaming, repair, configured keys and old
saved sessions. No live model calls are required for these checks.
