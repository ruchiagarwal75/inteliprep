# Architecture hero: before and after

The village hero has been replaced by an animated inline SVG architecture panel.
The rest of the existing Home and Brief design is retained. The PNG files here
are screenshots only; no screenshot or external image is used by the component.

| Page           | Before                            | After                           |
| -------------- | --------------------------------- | ------------------------------- |
| Home, desktop  | [Before](home-before.png)         | [After](home-after.png)         |
| Brief, desktop | [Before](brief-before.png)        | [After](brief-after.png)        |
| Home, phone    | [Before](home-mobile-before.png)  | [After](home-mobile-after.png)  |
| Brief, phone   | [Before](brief-mobile-before.png) | [After](brief-mobile-after.png) |

Desktop captures are 1440px wide; phone captures are 400px wide. Session rows and
elapsed times can differ because this is a live account. No interviews were
started, deleted or migrated for these screenshots.

## Files

- `src/components/architecture-hero.tsx`: reusable inline SVG, viewBox 680×350,
  accessible image role, unique title/description and grid IDs.
- `src/app/theme.css`: supplied panel, grid, line, server, amber, coral, teal,
  cream and label colors; 12px panel radius.
- `src/app/architecture-hero.css`: shapes, LEDs, dots, layout and animation bindings.
- `src/app/architecture-motion.css`: packet paths, node pulses and reduced-motion rules.
- `src/components/practice-hero.tsx`: shared Home/Brief placement. No scene is
  included in the interview workspace or scorecard body.

## Verified

- Three packets run for 9 seconds with delays of 0, 3 and 6 seconds.
- Paths pass through the load balancer and server 1/cache, server 3/database,
  or server 2/database respectively.
- Cache and both database arrivals reach scale 1.15; outlines turn amber.
- Animated properties are limited to transform, opacity and stroke.
- Hidden-tab animation state is paused; reduced motion disables all animation
  and retains three still packets.
- The SVG contains no image references and uses no additional library.
- At 768px and 400px the panel is above the headline, with no horizontal overflow.
- At desktop width the diagram stays clear of the headline, keeping labels readable.
- Tests, TypeScript, lint and production build pass.

This replacement changes only the hero component, theme tokens and styling.
Interview logic, routes and stored data are unchanged.
