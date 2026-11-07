# Supplied MockMeAI mascot

`src/components/mascot-art/Mascot.tsx`, `mascotArt.ts`, and `mascot.css` are exact copies of the files supplied from Downloads. Hash tests protect their original bytes; Prettier skips those three files. All placement, lifecycle, preference, reduced-motion and gentle-result behavior lives outside those files.

The development-only `/mascot-preview` route has replay controls for all three poses at their actual sizes. It returns 404 in a production build.

- Home uses `wave`, 80px, bottom left, 800ms after page/content readiness, 3.5 seconds total.
- Interview uses `working`, 64px. The first visit is bottom center for 7 seconds. Later visits are bottom right for 3.8 seconds. There is no reserved bottom gutter.
- Results use `done`, 80px, bottom right, 800ms after feedback readiness, 4.5 seconds total. Low/insufficient results retain the supplied friendly character, with sparkles, animated cheering and the success badge suppressed by wrapper CSS.
- Slide/fade wrappers animate only transform/opacity. Reduced motion uses opacity only and disables every supplied looping gesture. Each visit fully unmounts. A body portal avoids hidden chat panels and clipped/transformed containers.
- Show mascot is on by default. The checkbox is on Home and the live/results header; its `mockmeai:show-mascot` localStorage preference applies everywhere, including preview.

## Interview scheduling and diagnostics

Normal scheduling remains ten active minutes, then every ten active minutes. The interview has no real pause control or voice input. Drawing mode pauses interviewer questions, so it defers appearances without stopping the decorative clock. Explaining/replying, interaction/composition/held pointers, dialogs, hidden tabs, width below 768px, the preference, and the final two minutes guard appearances. A pending visit is retried every five seconds after activity, and requires five quiet seconds. Hidden tabs pause the decorative clock.

The UI clock and the first-visit marker persist in per-tab sessionStorage, separate from interview records, transcript storage and server timing. Refresh and ordinary rerenders do not restart them.

To test quickly, open `/interview/new?mascotTest=1`, start a **45-minute** throwaway interview, and leave that tab visible and untouched. The decorative schedule is 15 seconds, then every 45 seconds. The one-minute interview is intentionally excluded by the final-two-minutes guard. The test flag survives start/open navigation. Development console entries prefixed `[MockMeAI mascot]` report mount, active time, safety reasons, deferrals and appearances; they never contain answers or secrets.

The previous implementation was mounted, but stopped its clock for the entire drawing mode and disabled all reduced-motion appearances. It also rendered beneath the chat panel, which can be hidden by Board/Chat tabs. During verification, the hidden-tab safeguard correctly deferred visits when the shared tab lost visibility. These are distinct from a missing component mount.

## Screenshots and checks

- `preview-three-poses.png`: all three supplied poses in the temporary preview.
- `home-wave.png`: real Home, supplied wave artwork.
- `interview-working-test.png`: real signed-in test interview, supplied working artwork.
- `interview-working-center.png`: first-visit centered placement.

Timing and rendering verification is recorded alongside the final implementation checks. Existing saved interviews are preserved; browser verification uses throwaway attempts.

## Final whiteboard simplification

The custom Fit to screen and Styles controls, their helpers, and their tests were removed at the user's request. The canvas keeps its standard drawing/zoom tools, restores saved view state, and still fits the read-only final diagram when loaded. Shape-style panels remain hidden so they do not cover the drawing area.

Final checks: `npm run check` passed TypeScript, lint, formatting and 1,074 tests (one opt-in database test skipped). The production build passed. `interview-simplified.png` shows the final live whiteboard with both custom controls removed; normal rectangle drawing was verified. The earlier whiteboard header visible in mascot screenshots predates this final simplification.
