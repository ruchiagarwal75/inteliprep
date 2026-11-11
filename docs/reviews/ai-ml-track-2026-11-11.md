# AI / ML track and two ML systems

Shared changes add a remembered native-radio track picker, filtered options without
optgroups, the AI badge, track-local recommendations, per-problem rules and phase
names, configurable evaluation/safety area names, and ML diagram/estimate vocabulary.
The stored track ID remains `genai`; existing sessions need no migration.

Video recommendations and ad click prediction use the supplied briefs, raw facts
at all three levels, Senior anchors, reference designs, probes, red flags and level
bars. Both have the seven requested unweighted rubric areas and five ML phase titles.
Existing core and GenAI problem JSON files, rubrics and scoring weights are unchanged.

Only Senior anchors were supplied, so Mid/Staff anchor arrays are empty instead
of inventing values. Their estimate checks use disclosed inputs and candidate
assumptions. Recommendation candidate count and bytes per embedding value remain
example assumptions. The Mid recommendation objective stays more clicks as given;
Senior/Staff require satisfaction-aware reasoning. Probes paraphrase derived or
unasked numeric constraints instead of revealing private anchor answers.

Validation, with no live model calls or grading benchmarks:

| Item | npm run check | npm run build |
| --- | --- | --- |
| Shared engine/UI | 1,653 passing tests, 2 existing skips | Passed, private bundle check passed |
| Video recommendations | 1,661 passing tests, 2 existing skips | Passed, private bundle check passed |
| Ad click prediction | 1,669 passing tests, 2 existing skips | Passed, private bundle check passed |

Focused stub tests cover fact selection, multi-fact answers, no unasked facts,
private prompt/catalog boundaries, per-level configuration and arithmetic-redo
verdicts. They validate wiring and contracts, not real-model quality. The owner
will perform live interviewer and scoring review on beta.

UI-only capture verifies radio keyboard behavior, remembered track after reload,
all filtered option IDs, both new briefs and stage labels, and no horizontal scroll
at 1440px and 375px. It asserts no chat, start or end request. Earlier stubbed
browser regression also verified badges in the live/results header and history.
Screenshots stay outside Git in `artifacts/ml-track/{core,genai}-{1440,375}.png`.

No environment changes, secrets, new libraries or database migrations are required.
