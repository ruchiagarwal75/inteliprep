# MockMeAI visual refresh

The night-village illustration is an original inline SVG, inspired by the supplied
reference's atmosphere. It appears only in the Home hero and Brief header.
Interview and scorecard content has no illustration behind it.

## Before and after

| Page           | Before                            | After                           |
| -------------- | --------------------------------- | ------------------------------- |
| Home, desktop  | [Before](home-before.png)         | [After](home-after.png)         |
| Brief, desktop | [Before](brief-before.png)        | [After](brief-after.png)        |
| Home, phone    | [Before](home-mobile-before.png)  | [After](home-mobile-after.png)  |
| Brief, phone   | [Before](brief-mobile-before.png) | [After](brief-mobile-after.png) |

Desktop captures use a 1440px viewport; phone captures use 400px. Existing account
history was used, with no new interviews started or saved interviews deleted.

## Implementation

- `src/app/theme.css`: palette, eight-pixel spacing scale, two corner radii.
- `src/app/village.css`: hero composition and smoke animation.
- `src/components/village-header.tsx`: four houses, one chimney, layered hills,
  pines, crescent moon and four smoke circles. A visibility listener pauses the
  ten-second loop in hidden tabs; reduced motion disables it. Only transform and
  opacity animate.
- `src/app/practice*.css`: scoped entry-page, session-list, Brief and skeleton styles.
- Headings use Lora; interface text uses Geist. Technical code keeps its existing
  monospace font.
- Home shows three recent attempts. View all reveals the rest without changing
  saved data. Buttons have explicit Resume / View feedback labels.
- Brief keeps the existing choices and start action. The house stepper and tips
  are presentation only; the timer still starts through the existing Start action.

## Verification

The normal-text color pairs have contrast ratios from 5.47:1 to 16.60:1. Select
borders have at least 3.26:1 against the cream surface. Browser checks cover
400px and 768px layouts, original choices, hidden-tab pausing, reduced motion and
history expansion. Tests, TypeScript, lint and the production build pass.

## Loading investigation

Before changes, the signed-in Home became ready in 2.379 seconds and Brief in
2.593 seconds. Reading all 23 saved interviews (409,697 serialized bytes) took
10ms. An explicit authenticated OPTIONS request returned 204 in 21ms; the
reported 503 was not reproduced and is not attributed to a cause without evidence.

The automatic OPTIONS request came from a development-only route warm-up in
`useInterviewStarter`. That unused warm-up was removed; the actual Start action,
its API, quotas and idempotency are unchanged. Explicit OPTIONS remains supported
by Next.js. Server rendering and browser-history initialization now have skeleton
states instead of a blank wait or a plain loading line. Authentication, storage
format, routes, interview lifecycle and grading behavior were not changed.
