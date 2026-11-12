# RAG course fixes, round 2

## 1. Slides during a quiz

The quiz previously had no slide control. Its question form owns the selected
option, so replacing or navigating away from it would discard the selection.
Review now opens a native modal alongside that mounted form. Closing the modal
returns to the same form and question. A separate route or browser tab was
rejected because it would not pause the quiz's visible-time tracker reliably.

The timer uses its existing server activity lease with `visible: false` while
review is open. A shared request queue preserves pause/resume ordering across
effect cleanup. The local elapsed checkpoint survives those transitions.
Server tests cover repeated pauses without losing stars or XP.

The stored furthest-read checkpoint still controls first-quiz access. An
additive `last_viewed_index` column records reading position separately, and
older rows fall back to their existing checkpoint. One ordered client queue
handles both progress and backward reading without reducing completion.

Passed and failed topic results link to their slides. Started topic nodes have
a native disclosure with a Review slides link. Viewing a started topic stays
available even if its earlier unlock state is no longer present. Quiz unlock
and grading rules remain server-owned and unchanged.

QA uses isolated local accounts only, as the owner requested. The owner account
is never used for browser checks. Preview verification will check the deployment
build status until a separate Google QA account is available.

## 2. Thirteen Topic 1 slides

The build reads the supplied v2 Markdown as Topic 1's slide source. A strict
compiler preserves paragraphs, list items and bold wording without generating
content. All seven Topic 1 questions and both other topics remain unchanged.
The renderer escapes HTML and supports only the authored formatting subset.

A compatible constraint expansion supports longer lessons. Existing completed
visits remain completed. Fresh accounts must save all 13 ordered checkpoints.
Reading position, earned rewards and old answer snapshots are preserved.
