# MockMeAI mascot verification

The original SVG girl is decorative, silent, and ignores pointer events. Her lower half is clipped at the screen edge. Each visual visit unmounts after its finite entrance, gesture, and exit animation.

- Home: 80px, bottom left, 800ms after content/window readiness; 500ms in, 2500ms wave, 500ms out. Once per Home mount.
- Interview: 64px, bottom right, once per ten minutes of the decorative active clock; 400ms in, 3000ms typing, 400ms out.
- Results: 80px, bottom right, 800ms after feedback is available; 500ms in, 3500ms cheer or encouragement, 500ms out. Low or unscored results use a smile and thumbs-up without sparkles.

The app has no timed pause or voice-input feature. Drawing mode pauses only the mascot clock; explaining suppresses appearances. Hidden tabs pause that clock. It waits for five quiet seconds, defers during replies, explanation, drawing, composition, held pointers, or dialogs, and skips the final two minutes. Interaction dismisses a visible working visit. All visits are disabled below 768px and with reduced motion. Permanent edge gutters prevent an appearance from covering controls or resizing the board.

Only a small decorative clock is saved in per-tab sessionStorage, under `mockmeai:mascot-clock:<id>`. It survives refresh without replaying passed milestones. Interview timing, routes, saved interviews, transcripts, and scoring are unchanged. No input contents or audio are collected.

## Verification

- `npm run check`: TypeScript, lint, formatting, and 1,068 tests passed; one opt-in test skipped.
- `npm run build`: passed.
- Real Home in Chromium: 80px clipping viewport, 160px portrait, no overlapping controls, `pointer-events: none`, unmounted after approximately 3,500ms, no repeat. Mobile and reduced-motion runs mounted nothing.
- Actual interview/results components were bundled into a browser-only isolated fixture, with Playwright's clock advanced. No saved interview or server/model request was used. Verified ten- and twenty-minute visits, drawing pause, five-second quiet deferral, busy-reply deferral, activity dismissal, no immediate replay, hidden-tab pause, mobile/reduced-motion removal, final-two-minute suppression, results readiness, 4.5-second removal, and low-result tone.

`home-wave.png` shows the real public Home page. `interview-working.png`, `result-cheer.png`, and `result-encourage.png` show the isolated component fixture, not real interview records. Gesture animations were held briefly for those screenshots; their finite unmount timers were still verified.
