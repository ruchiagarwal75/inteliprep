# MockMeAI scaling story

The Home page uses the supplied `ScalingStory.tsx` and `scalingStory.css` unchanged,
with `showControls={false}`. The final layout follows the original hero placement:
to the right of the headline on desktop, above the text on mobile. Its 680 / 340
canvas ratio and mobile caption space are reserved. The mascot stays clear of
the animation and Start practice button. The Brief, interview and results pages
do not render the story. No interview records, routes or interview timers changed.

The previously requested Home mascot change is included: a 112px frame, a 7.5-second
visit, and a peek from one quarter of the way across the recent-sessions card.
The Brief page shows a 15-second working-pose visit above its white setup card.
No mascot or decorative mascot clock is mounted during a live interview, and the
unused live-interview side gutter and toggle are removed. Results keep their visit.

## Home screenshots

| Viewport            | Before                                           | After                                   |
| ------------------- | ------------------------------------------------ | --------------------------------------- |
| Desktop, 1440 × 900 | [Original architecture](home-before-desktop.png) | [Scaling story](home-after-desktop.png) |
| Mobile, 390 × 844   | [Original architecture](home-before-mobile.png)  | [Scaling story](home-after-mobile.png)  |

These are full-page screenshots of the same signed-in account and browser history.

## Animation screenshots

- [Step 1: One user](animation-step-1.png)
- [Step 4: Add a database](animation-step-4.png)
- [Step 6: Cache saves it](animation-step-6.png)
- [Brief page: working mascot above the setup card](brief-working.png)
- [Live interview: no mascot or decorative gutter](live-interview-no-mascot.png)

## Verification

- Observed all seven steps advancing automatically and looping back to the first.
- No console errors, page errors or hydration warnings during the loop.
- No horizontal scroll at 1440px or 390px; the reserved story area and recent-sessions
  position stayed stable through the complete loop.
- Reduced motion stopped automatic step changes and paused SVG packet motion.
- The Home mascot appeared, stayed clear of the artwork/button, then unmounted.
- The Brief mascot stayed mounted for its 15-second visit above the card without
  covering the description or setup controls, then unmounted.
- A throwaway live interview had no mascot, including after the former test delay;
  ending it generated its empty-session feedback. Existing saved interviews were kept.
- TypeScript, ESLint, formatting, 1,075 tests and the production build passed;
  one existing opt-in database test remained skipped.

The supplied files are excluded from automatic formatting. Their SHA-256 hashes are:

```text
57f70107bff1bf5571d673cb1409323e61d42dfa192c28ce77b3ed890f824f6b  ScalingStory.tsx
1aa3d0816d114b9ffe29899fdc6aa35a24eb418854b9c6d511e12261011830b9  scalingStory.css
```
