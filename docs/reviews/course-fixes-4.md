# Course fixes 4

All work uses isolated local fixture accounts. No live model calls, secret or
environment changes, owner-account testing, or Production deployment.

## 1. Learn slide layout

The reproduction measured the Topic 1 frame at y=400.75, height 417.58, with a
280px body minimum. The stacked header and that minimum caused the empty floor.
The sticky controls had a solid top border and no overflow cue.

The header is one row. Slides use their content height. Each load and slide
change aligns the frame 12px below the viewport top. Short slides get document
scroll range outside the card, rather than blank space inside it. A 24px fade
appears only while content extends beneath the controls. The border is gone.

S6 and S9 use landscape SVGs on desktop and keep their portrait versions below
600px. Desktop diagrams are capped at 220px; those two are capped at 200px.

`course-fixes-4-learn.spec.ts` checks all 33 slides in Topics 0 through 3 at
1440×669 and 375×812, in both themes. It checks alignment, the fade, card spacing,
diagram height, keyboard navigation, and horizontal overflow. Screenshots are
under `artifacts/course-fixes-4/learn-T*-S*-{light,dark}-{1440,375}.png`.
