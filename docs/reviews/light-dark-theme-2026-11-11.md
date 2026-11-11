# Light default and remembered dark mode

- Light is the first-visit default, including when the OS prefers dark mode.
- Shared tokens in `src/app/theme.css` cover pages, admin, SVG illustrations,
  feedback, statuses and controls. The original mascot geometry and pigments
  are checked after resolving its new color tokens.
- Header controls save the preference to a cookie and localStorage. A nonced
  head script restores a storage-only choice before the body paints. Storage
  failures are tolerated independently; CSP is unchanged.
- Excalidraw uses its native screen theme. Chat and grading PNGs explicitly
  export in light mode on white, without changing drawing content or viewport.
- Narrow header controls wrap instead of overlapping.

Validation: `npm run check` passed (1,627 tests, 2 existing skips), `npm run build`
passed, and `npm run test:e2e` passed all 26 tests. Tests cover preference persistence,
first paint, blocked storage, admin surfaces, actual PNG background pixels, unchanged
scene/viewport, and native 90%, 100% and 110% browser-zoom drawing geometry. All
providers and reporting infrastructure in browser tests are isolated local stubs.
No live model calls were made.

The screenshot journey has its own fixture account. Sharing the zoom-test account
initially hit the real three-starts-per-minute guard; application quotas were not
changed. The scored-results screenshots use a public UI fixture after a real
stub-infrastructure end/freeze flow. They are presentation checks, not grading
benchmarks.

Twelve screenshots are saved outside Git in `artifacts/light-theme/`, named
`{home,interview,results}-{light,dark}-{1440,375}.png`. Existing saved interviews,
main, production settings, and credentials were not changed. No migration is needed.
