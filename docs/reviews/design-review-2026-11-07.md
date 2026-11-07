# MockMeAI design review implementation

7 November 2026. All five priority groups were implemented in order, using the existing navy, cream, Lora, Geist and dark-teal theme. Saved interviews were not deleted or migrated. The supplied scaling animation, captions, mascot drawing and mascot speech bubble source files were preserved exactly.

## Priority 1: bugs

1. **Stage names:** a single public list supplies Brief, live header and Results. Private problem rubrics and internal stage IDs are unchanged.
2. **Test duration:** the one-minute option requires development mode and `NEXT_PUBLIC_ENABLE_TEST_INTERVIEWS=1`. It is absent from production bundles. `?debug=1` alone does not enable it.
3. **Expired sessions:** Home derives both the action and destination from deadline-aware status. Expired entries show View feedback and open Results. A lightweight Home clock updates this without a refresh.
4. **Results centering:** removed the asymmetric mascot gutter and reused the Home container. At 1440px the content is 1168px wide, with equal 136px margins.
5. **Diagram grammar:** shared component-list formatting supplies articles and natural conjunctions, including “an unlabeled box” and `a component labeled "Database"`. Both updated-drawing and board-visibility replies use it.
6. **Interview loading:** a route-specific skeleton now has the same brand/header position, board and chat split as the live layout. Results has its own loading entry too.
7. **Start width:** a 196px minimum keeps Start interview and Starting... the same width. Both states measured 196px in Chrome.
8. **Time used:** appears once in the Results heading. The authoritative ended time and grading inputs are unchanged.
9. **Display names:** lowercase imported provider names are title-cased. Explicit display names and intentional mixed-case names are preserved. Display formatting never grants authorization.

## Priority 2: interview

1. **Theme:** cream header/panels, Lora headings, existing corner radii and shared dark-teal primary buttons match Home and Brief.
2. **Whiteboard:** the default canvas is cream. Existing deliberately chosen non-white canvas backgrounds are preserved. Scoped selectors hide Library, shortcut number hints and the bottom movement tip; existing scene data is unchanged.
3. **Problem brief:** a styled chevron replaces the native marker. The open panel has a bounded internal scroll area, preserving chat space.
4. **Pace buttons:** the next action is filled; the alternate action is outlined. Disabled text stays readable. The existing 500ms mode-change guard remains.
5. **Single instructions:** one status line above the composer communicates the mode and disabled hints. Display-only transcript filtering hides control events and repeated hand-off instructions, while retaining real questions and answers.
6. **Short opener:** the visible first message asks about requirements. The full original brief remains in the panel and in the verified internal transcript for grounding, grading and request-count integrity. Existing saved messages are not rewritten.
7. **One teal:** buttons use the existing dark brand teal; candidate bubbles use a muted dark teal with light text.
8. **Identity:** interviewer bubbles include a small M avatar and MockMeAI interviewer label.
9. **Voice:** the prompt requests contractions, plain language and no UI-button instructions. Display filtering removes old control-only sentences, including in saved transcripts. New user-facing copy does not use em dashes.
10. **End dialog:** X in the corner, outlined Keep going and filled End interview, plus remaining time. Existing draft-preservation and double-submit safeguards remain.
11. **Mascot:** restored the existing scheduler mount per this review's explicit request. Its earlier absence followed the previous request to remove it from live interviews. The original art and idle/busy/width/remaining-time safeguards remain. A normal ten-minute appearance was observed. In development, append `?mascotTest=1` to the live URL for a prompt appearance after the quiet-time guard; it never changes the actual interview clock.

## Priority 3: results

1. **Theme:** cream sections, shared page width and dark-teal actions match the app.
2. **Tabs:** clear active state, roving keyboard focus, Arrow/Home/End support and associated panels.
3. **Loading:** an indeterminate progress treatment and the original working mascot when enabled. The current API does not emit grading substeps, so the UI does not pretend it knows which step has completed. Retry is absent while generation runs.
4. **Scorecard:** whole-page scrolling replaces the inner scroll box. Area summaries show the 1–4 scale or missing evidence. Exact candidate quotes remain behind Show evidence, with readable 16px text and stronger contrast.
5. **Evidence note:** “Scores show after you've used at least a third of the time and answered in two stages.” Older stored wording is normalized only for display.
6. **Transcript:** limited to 640px, with the same readable bubble treatment as live chat.

## Priority 4: crafted details

1. **Copy:** the supplied headline, Brief subtitle and browser-history footer are used verbatim.
2. **Kickers:** removed section kickers except the Home hero label.
3. **Accents:** self-hosted the installed Excalidraw Latin Excalifont with its OFL notice. Only stage labels, speech-bubble text and diagram captions use it. Animation source is unchanged; the caption receives a scoped font override.
4. **Guide:** replaced tinted stock-icon rows with three actual UI crops showing drawing, explaining and discussing. They contain only synthetic test content.
5. **Stepper:** simple 1–5 numbers, no houses, and You'll begin here beside stage 1.
6. **Soft words:** removed repeated soft marketing phrases. The concrete exercise wording “a small website” remains the single use across Home/Brief.

## Priority 5: polish

1. **Mascot preference:** accessible labeled switch in the account menu, with the existing localStorage preference preserved.
2. **Count:** the saved-attempt count appears once; View all does not repeat it.
3. **History:** View all expands in the page without a nested scroll box. All attempts remain available.
4. **Mobile hero:** headline and Start practice precede the protected animation. At 520px, the CTA bottom was 419px and the animation began at 475px; no sideways scrolling.
5. **Account menu:** includes the mascot switch and Practice history, linking to the existing Home history section. No new history route was needed. Sign out remains readable.

## Added request: new app visitors

The private admin dashboard now has **New app visitors (browsers)**: total first visits since tracking began and first visits in the trailing seven days, scoped to the reporting environment. Signups remain a separate account metric.

A first-party random ID in localStorage is hashed before persistence. First-seen time is server-generated and never reset by refresh, retries or sign-in. The optional account link comes from verified server authentication, not client input. Admin/test/development visits follow the existing exclusion filter. The new write-only visitor endpoint is same-origin, size-bounded and separately rate-limited. Every read remains protected by the existing fresh admin check. Writes use the existing best-effort reporting helper and cannot interrupt an interview.

No page trails, referrers, IP addresses, answers, audio, third-party analytics or online-presence data are stored. This is distinct browsers, not exact people: another browser or cleared storage may count again; blocked storage and failed reporting may miss a visit. Visits before tracking began are unavailable. The new private table has RLS enabled and no browser-role grants. The additive migration was applied through `npm run db:admin`, preserving all 28 existing reporting records at migration time. No new environment settings are required for the already-configured project. Other environments/databases should run the same migration command.

## Verification

- After each priority group: existing tests, TypeScript, lint, formatting and a production build passed.
- Final suite after visitor tracking: **1,092 tests passed; one existing opt-in database test skipped**. Production build passed.
- Real Chrome full interview: URL shortener, 26:39 elapsed, requirements, drawing, two explanation messages, discussion, pause/draw/explain, scaling and reliability, end and Results. The interviewer stayed silent during explanation and noticed the added ZooKeeper component.
- PostgreSQL/Cassandra conflict was caught, then marked resolved after clarification. An undrawn load balancer was identified separately in feedback.
- Double-clicking End produced one end request. Results opened immediately, grading succeeded on its first attempt, and elapsed time stayed 26:39 before and after feedback.
- An empty attempt showed the no-technical-answer message with no scores. A one-minute attempt expired in Home and opened automatic feedback through View feedback. A second one-minute attempt stayed on the live page, auto-ended at zero and generated its empty-session result without Retry, showing 01:00 of 01:00.
- Desktop 1440px and narrow 520px screenshots cover all four pages. Board/Chat tabs, keyboard tabs, 640px transcript, evidence toggles, and full final-diagram view were checked.
- Normal ten-minute mascot appearance and development test mode were both checked. Preference persisted through refresh.
- Visitor API returned one included browser before and after reload, and zero when excluding admin/development activity. Signed-out admin API returned 401. Existing non-admin authorization tests pass.
- No new runtime or hydration errors were observed. Chrome's existing Excalidraw development-time unload-permissions warning remains; no security policy was weakened to conceal a vendor warning.
- Four throwaway attempts were added for verification. Existing interviews remain intact.

[Before/after gallery](../../artifacts/mockmeai-design-review/README.md).

## Decisions and scope

No app routes, model selection, timer rules, scoring rubric areas, saved history format or authentication policies were changed. The one-minute picker has the existing additional local feature flag. A short opener and control filtering are presentation-only, preserving canonical transcript integrity. Progress is indeterminate until the existing grading API returns. The security-review document in this directory is a separate backlog, not an instruction to expand this design change.

## Changed files

- [docs/reviews/code-review-2026-11-07.md](../../docs/reviews/code-review-2026-11-07.md)
- [public/fonts/Excalifont-LICENSE.txt](../../public/fonts/Excalifont-LICENSE.txt)
- [public/fonts/Excalifont-Regular.woff2](../../public/fonts/Excalifont-Regular.woff2)
- [public/practice-guide/discuss.png](../../public/practice-guide/discuss.png)
- [public/practice-guide/draw.png](../../public/practice-guide/draw.png)
- [public/practice-guide/explain.png](../../public/practice-guide/explain.png)
- [scripts/migrate-admin.mjs](../../scripts/migrate-admin.mjs)
- [src/app/admin/page.tsx](../../src/app/admin/page.tsx)
- [src/app/api/admin/visitors/route.ts](../../src/app/api/admin/visitors/route.ts)
- [src/app/api/monitoring/viewer/route.test.ts](../../src/app/api/monitoring/viewer/route.test.ts)
- [src/app/api/monitoring/viewer/route.ts](../../src/app/api/monitoring/viewer/route.ts)
- [src/app/candidate-profile.css](../../src/app/candidate-profile.css)
- [src/app/globals.css](../../src/app/globals.css)
- [src/app/handmade-accents.css](../../src/app/handmade-accents.css)
- [src/app/interview.css](../../src/app/interview.css)
- [src/app/interview/[id]/loading.tsx](../../src/app/interview/[id]/loading.tsx)
- [src/app/interview/[id]/results/loading.tsx](../../src/app/interview/[id]/results/loading.tsx)
- [src/app/layout.tsx](../../src/app/layout.tsx)
- [src/app/mascot.css](../../src/app/mascot.css)
- [src/app/practice-brief.css](../../src/app/practice-brief.css)
- [src/app/practice-home.css](../../src/app/practice-home.css)
- [src/app/practice-loading.css](../../src/app/practice-loading.css)
- [src/app/results.css](../../src/app/results.css)
- [src/app/theme.css](../../src/app/theme.css)
- [src/components/admin-visitors-panel.tsx](../../src/components/admin-visitors-panel.tsx)
- [src/components/app-viewer-tracker.tsx](../../src/components/app-viewer-tracker.tsx)
- [src/components/candidate-account-context.tsx](../../src/components/candidate-account-context.tsx)
- [src/components/candidate-profile-menu.tsx](../../src/components/candidate-profile-menu.tsx)
- [src/components/candidate-workspace.tsx](../../src/components/candidate-workspace.tsx)
- [src/components/chat-composer.tsx](../../src/components/chat-composer.tsx)
- [src/components/chat-panel.tsx](../../src/components/chat-panel.tsx)
- [src/components/chat-transcript.test.ts](../../src/components/chat-transcript.test.ts)
- [src/components/chat-transcript.tsx](../../src/components/chat-transcript.tsx)
- [src/components/end-interview-confirmation.tsx](../../src/components/end-interview-confirmation.tsx)
- [src/components/interview-brief.tsx](../../src/components/interview-brief.tsx)
- [src/components/interview-chat-options.ts](../../src/components/interview-chat-options.ts)
- [src/components/interview-dialog.tsx](../../src/components/interview-dialog.tsx)
- [src/components/interview-duration-picker.tsx](../../src/components/interview-duration-picker.tsx)
- [src/components/interview-end-control.tsx](../../src/components/interview-end-control.tsx)
- [src/components/interview-history.tsx](../../src/components/interview-history.tsx)
- [src/components/interview-live-header.tsx](../../src/components/interview-live-header.tsx)
- [src/components/interview-mascot.tsx](../../src/components/interview-mascot.tsx)
- [src/components/interview-pacing.test.ts](../../src/components/interview-pacing.test.ts)
- [src/components/interview-pacing.tsx](../../src/components/interview-pacing.tsx)
- [src/components/interview-results.tsx](../../src/components/interview-results.tsx)
- [src/components/interview-scorecard.tsx](../../src/components/interview-scorecard.tsx)
- [src/components/interview-session-workspace.tsx](../../src/components/interview-session-workspace.tsx)
- [src/components/interview-spec-ui.test.ts](../../src/components/interview-spec-ui.test.ts)
- [src/components/interview-stage.tsx](../../src/components/interview-stage.tsx)
- [src/components/interview-workspace.tsx](../../src/components/interview-workspace.tsx)
- [src/components/mascot-preference.tsx](../../src/components/mascot-preference.tsx)
- [src/components/mascot-switch.test.ts](../../src/components/mascot-switch.test.ts)
- [src/components/practice-guide.tsx](../../src/components/practice-guide.tsx)
- [src/components/practice-hero.tsx](../../src/components/practice-hero.tsx)
- [src/components/practice-home.test.ts](../../src/components/practice-home.test.ts)
- [src/components/practice-home.tsx](../../src/components/practice-home.tsx)
- [src/components/practice-page.tsx](../../src/components/practice-page.tsx)
- [src/components/practice-skeleton.tsx](../../src/components/practice-skeleton.tsx)
- [src/components/practice-stepper.tsx](../../src/components/practice-stepper.tsx)
- [src/components/scorecard-evidence.tsx](../../src/components/scorecard-evidence.tsx)
- [src/components/scorecard-loading.tsx](../../src/components/scorecard-loading.tsx)
- [src/components/scorecard-review.test.ts](../../src/components/scorecard-review.test.ts)
- [src/components/whiteboard.tsx](../../src/components/whiteboard.tsx)
- [src/lib/admin-visitors.ts](../../src/lib/admin-visitors.ts)
- [src/lib/app-viewer.test.ts](../../src/lib/app-viewer.test.ts)
- [src/lib/app-viewer.ts](../../src/lib/app-viewer.ts)
- [src/lib/candidate-display-name.ts](../../src/lib/candidate-display-name.ts)
- [src/lib/chat-display.ts](../../src/lib/chat-display.ts)
- [src/lib/design-review-regressions.test.ts](../../src/lib/design-review-regressions.test.ts)
- [src/lib/diagram-component-copy.ts](../../src/lib/diagram-component-copy.ts)
- [src/lib/diagram-consistency.ts](../../src/lib/diagram-consistency.ts)
- [src/lib/interview-stage-names.ts](../../src/lib/interview-stage-names.ts)
- [src/lib/interviewer-input.ts](../../src/lib/interviewer-input.ts)
- [src/lib/pending-diagram-components.ts](../../src/lib/pending-diagram-components.ts)
- [src/lib/phase-config.test.ts](../../src/lib/phase-config.test.ts)
- [src/lib/phase-config.ts](../../src/lib/phase-config.ts)
- [src/lib/request-limits.ts](../../src/lib/request-limits.ts)
- [src/lib/scorecard-calibration.ts](../../src/lib/scorecard-calibration.ts)
- [src/lib/viewer-tracking.test.ts](../../src/lib/viewer-tracking.test.ts)
- [src/lib/viewer-tracking.ts](../../src/lib/viewer-tracking.ts)
- [supabase/migrations/20261107221500_app_viewer_reporting.sql](../../supabase/migrations/20261107221500_app_viewer_reporting.sql)
- [Before/after screenshots and gallery](../../artifacts/mockmeai-design-review/README.md)
