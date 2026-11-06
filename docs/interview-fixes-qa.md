# Interview fixes: acceptance coverage

All automated storage tests use fixtures. Browser checks used an isolated origin
(`127.0.0.1:4310`), a throwaway account, the real workspace/IndexedDB/Excalidraw
components, and a scripted API. Existing user interviews were never deleted.
Browser checks do not establish live-provider answer quality or production auth.

| Fix | Repeatable automated coverage | Browser evidence |
| --- | --- | --- |
| P0 timing gates | `stage-clock.test.ts`, existing phase and session recovery suites | Clock simulation verifies core/reliability at 25 minutes left and no early wrap-up |
| P0 diagram context | `interview-spec-p0.test.ts`, scene graph/text/diff suites | Production editor created, labeled, duplicated, saved and restored components |
| P0 open questions | `open-question-session.test.ts`, handoff and listening suites | Explaining stayed quiet; Done was disabled before a message |
| Home/Brief/routes | `interview-navigation.test.ts`, `legacy-route.test.ts`, storage suite | Fresh Home, explicit Resume, full brief before timer, correct live/results URLs |
| Layout and pacing | `interview-pacing.test.ts`, `interview-spec-ui.test.ts` | 1440/768/400 px fit without horizontal scrolling; double-clicks did not skip modes; Chat unread dot worked |
| Results/calibration | `interview-spec-p1.test.ts`, scorecard validation/calibration and catalog interview suites | Retry/Next/Home above the fold; transcript tab; fitted read-only diagram without toolbars |
| Draft and retry | `interview-spec-p1.test.ts`, transcript-sync, pending-reply and post-chat-turn suites | Full final draft survived immediate reload; offline failure kept the message; retry completed |
| Timer and controls | UI warning assertions, existing timer/end/retry suites | One-minute clock simulation auto-ended; retry returned to a 45-minute brief; end confirmation remained present |
| P2 wording/focus | `interview-spec-ui.test.ts`, existing empty-message checks | Whitespace cleared on Enter; shared focus-visible styling; stable pace-control position |

The Next.js production build includes Home, Brief, Interview and Results routes.
The standalone browser bundle selected Excalidraw's production export. On MacIntel,
Cmd+A followed immediately by Cmd+D duplicated both the rectangle and its bound
label with no console error. No newer stable npm release than 0.18.1 was available.
The editor's onChange callback does not write elements back into its scene.

Slow replies expose Still thinking after 15 seconds and a cancel-and-retry action
after 45 seconds. The retry preserves the existing turn ID; server replay and
transient-provider retry behavior have separate regression tests. Image export
is bounded to three seconds before text fallback and does not receive the editor
viewport API. Turn preparation and completion timings are logged separately.

Undo/redo works during the mounted editor session. Excalidraw's public API exposes
history.clear, but no history import/export, so undo stacks cannot be restored
after a full refresh. Native scene and viewport restoration remain supported.

The timing acceptance tests simulate a 45-minute session rather than waiting
45 wall-clock minutes. A full live-model interview remains a useful manual beta
retest for conversational quality.
