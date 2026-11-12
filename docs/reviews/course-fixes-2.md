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

## 3. Long slide reader

The old reader grew with its text and pushed navigation below the page. The
slide frame now reserves room for its title and navigation. Only its body scrolls.
Inter text stays at 16 px with a 1.75 line height and a 640 px maximum width.
Bullets, numbered lists and bold use semantic HTML. Each slide starts at the top
of its body. The same frame is used in the quiz overlay.

## 4. Vector diagrams

Slides 2, 6, 8 and 9 now use the diagrams specified in the v2 source. The pipeline
includes cleaning and enrichment. The overlap example has three chunks. The
table compares a broken split with repeated headers. Small-to-big retrieval
shows a matched chunk and its parent going to different destinations.

The SVGs use Inter labels, square boxes, 2 px strokes and clear arrowheads.
Violet shows the structure and gold marks the point to notice. Slide 8's red X
follows the supplied diagram instruction. All paints use theme tokens and every
diagram has descriptive alt text. Compact versions keep labels readable on phones.
