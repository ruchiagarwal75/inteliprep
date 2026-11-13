# Course fixes 5 (retest of course-fixes-4)

Tested on the beta preview at 1440 x 725, commit 89c33c7. course-fixes-4 items 2, 3, 6, 7 and 8 pass. Items 1 to 4 below still apply on dac5d2b; item 5 is new.
Same rules as course-fixes-4: fixture accounts only, no live model calls, no env or secret changes,
no production deploy, no `main`, no em dashes. `npm run check` and `npm run build` per item,
one commit per item, push `beta` at the end. Acceptance sizes: 1440 x 669 and 375 x 812, both themes.

## 1. Learn page: replace auto-scroll with a focus shell (High)

The course-fixes-4 auto-scroll fits the slides, but it creates three new problems:
- The site header, the topic row and "Start quiz" scroll out of view (scrollY 270 on every slide). The player loses the exit, the title and the quiz button.
- The Back/Next buttons move on every slide. On Topic 1, Next sits anywhere from y=318 to y=632, so mouse users chase it.
- Short slides leave half the screen empty because of the added scroll spacer.

The item 1 spec asked for the auto-scroll, so this is a spec fix, not a regression.

Fix: give Learn the same focus shell as the quiz.
1. On /play/rag/topics/[n], hide the site header and HUD, like the quiz page.
2. Fixed top bar: back X (to the path), "Topic N · Title", slide progress segments (one per slide, filled up to the current one), "Start quiz" (only when unlocked), theme toggle.
3. Fixed bottom bar: Back on the left and Next / Start quiz on the right, always in the same place.
4. Slide card fills the space between the bars. Use a CSS grid `auto 1fr auto` with `min-height: 0` on the card row, so the card always has a real height. When content is taller than the card, the card scrolls inside and shows the 24 px fade. Reset the card's scroll to the top on every slide change.
5. Remove the auto-scroll and the extra scroll spacer.
6. Keep arrow keys and Enter. Escape goes back to the path.

Acceptance (all 33 slides in Topics 0 to 3):
- The Next button's position is identical on every slide.
- The top bar and the Start quiz button (when unlocked) stay visible on every slide.
- The card height is at least 300 px at 1440 x 669. Every slide's full text is reachable by scrolling inside the card. The fade shows only when there is more below.
- Page-level vertical scroll is 0.

## 2. World unlocked card covers Topic 0 (Medium)

In artifacts/course-fixes-4/unlock-dark-1440.png, the card sits top-left over the Topic 0 node. It hides its stars and most of "Practice again". The 375 px version is fine.

Fix: at widths of 900 px and up, center the card horizontally above the path. Alternatively, place it in the empty column opposite the Topic 0 node. It must not overlap any node, label or button.

Acceptance: at both sizes, the card's bounding box intersects no path node, label or button.

## 3. Path centering is slow on first load (Low)

At 4 s after load, the path still showed Topics 0 and 1. It reached Topic 2 later.

Fix: on first load, jump straight to the current topic (no smooth scroll). Keep the smooth scroll for in-page moves, such as after the unlock.

## 4. Empty gap in the wrong-answer panel (Low)

On Topic 1 Q1, picking "Vector databases can't store them" leaves an empty gap between the Answer line and "See slide 6". That option has no ifWrong line.

Fix: don't render the ifWrong element when it's empty. Then list every option across Topics 1 to 3 that has no ifWrong line in docs/reviews/course-fixes-5.md, so the content can be filled in.

## 5. Diagram polish (Low)

From artifacts/course-content-3 and course-content-4 contact sheets:
1. T9 S11: "Metrics OK?" text spills outside the diamonds. Make the diamonds larger or the label two short lines that fit inside.
2. T8 S9: step labels ("Vector search slow", "Everything down") touch or overlap the boxes. Keep at least 8 px clear around every label.
3. T8 S5: the "Replica" labels overlap the shard box edges. Give replicas their own boxes behind each shard, with no text collision.
4. T8 S2: the ingestion line and the re-ranker to LLM line cross near the right edge. Route the ingestion arrow into the bottom of "Indexes" without crossing other arrows.

Add a test that checks no SVG text box intersects another text box or a box border in these four diagrams, at both sizes.

## Report

Write docs/reviews/course-fixes-5.md (one short section per item, with tests and screenshots under artifacts/course-fixes-5/), then push `beta`.
