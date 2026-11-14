# Page performance improvements

The four approved changes add immediate loading feedback, remove writes from player snapshot reads, reuse database connections, and reduce notebook and learning-path responses. The detailed path remains the default; map overview stays behind its button.

## Measured results

Optimized Next builds ran against isolated HTTPS Auth and Postgres fixtures. No real account or model requests were used in the browser checks. HTML sizes include the full decoded document and embedded React payload, before network compression; separate JavaScript and CSS assets are excluded.

| Measure | Before | After |
| --- | --- | --- |
| Player snapshot statements, including transaction setup and commit | 10 | 4 |
| Player snapshot write attempts | 3 | 0 |
| Detailed path HTML, across both themes and viewport sizes | About 179 KB | 59,081 to 59,245 bytes |
| Notebook HTML | About 740 KB for all topics | 64,338 to 88,432 bytes for one selected topic |
| Click to visible loading DOM, with content requests delayed 900 ms | No loading frame | 14.2 to 23.5 ms |
| Read-only database query after 11.5 seconds idle, measured from this Mac | 600 ms with a 10-second idle timeout | 80 ms with a 60-second idle timeout |

The database experiment isolates connection setup. It does not imply that every production page becomes 520 ms faster. The loading measurement starts at the browser click event and observes visibility; it is not a field paint metric.

The following comparable six-route probe uses the last of three document loads for each route. These local, low-latency fixture samples are diagnostic, not production percentile claims. Streaming makes first byte earlier than completed content.

| Route | Before HTML bytes | After HTML bytes | Before TTFB ms | After TTFB ms | Before full response ms | After full response ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| /play | 74,671 | 46,434 | 88 | 19 | 94 | 50 |
| /play/rag | 179,213 | 59,081 | 49 | 12 | 55 | 28 |
| /play/rag/topics/1 | 39,801 | 46,776 | 54 | 23 | 59 | 49 |
| /play/rag/notebook | 740,213 | 64,322 | 97 | 15 | 129 | 123 |
| /mock | 91,050 | 60,662 | 101 | 11 | 108 | 39 |
| /progress | 31,035 | 36,048 | 32 | 11 | 33 | 32 |

## Implementation

1. Added loading boundaries for Play, the RAG path, lessons, notebook, Mock and Progress. The Play layout's awaited account shell is under Suspense so layout data cannot hide the loading frame. Placeholders contain no private account data.
2. Player snapshots now run in a read-only transaction with the same per-account RLS setting. One aggregate query reads progress and daily-goal state. Existing streak and readiness policies project current values without persisting them on page views. First Play actions and profile updates already create profiles and streak rows. Reward actions retain their write locks and event recording.
3. The shared reporting/Play client stays module-scoped, with idle timeout 60 seconds and maximum lifetime 600 seconds. Connection limits, certificate verification, connect timeout, statement timeout and disabled prepared statements stay as configured.
4. The notebook queries only the selected topic and submitted answers belonging to that account. Its compact topic chooser retains all ten topics. Quiz results link directly to the completed topic. Unanswered solutions remain absent. The learning path receives compact display data instead of a repeated server element tree. Sprite compilation merges adjacent rows and groups same-color rectangles into SVG paths. Browser rasterization compared every output pixel with the previous row-run representation in both themes.

## Validation

- Full check passed: 2,087 tests, with two existing skipped tests, plus typecheck, lint and formatting.
- Optimized builds and both private-content browser-chunk scans passed.
- Final ten browser checks passed for loading under delayed responses, all ten notebook payloads, compact topic selection, pixel equality and the saved-answer flow. Both themes and 1440 by 669 / 375 by 812 layouts were covered.
- A further six map and diagram checks passed against the same final build, followed by the six-route measurement probe. No browser page errors or model calls were observed.
- Real Postgres equivalence checks cover UTC midnight, Los Angeles midnight, Kiritimati midnight, India midnight, a New York DST transition, readiness expiry, fresh-account defaults, account isolation and enforced read-only transactions.

Rerun the browser checks with the existing fixture harness:

```sh
npm run test:e2e -- tests/e2e/page-navigation.spec.ts tests/e2e/page-payload.spec.ts tests/e2e/pixel-paths.spec.ts tests/e2e/play.spec.ts tests/e2e/course-map.spec.ts tests/e2e/course-diagrams.spec.ts tests/e2e/course-fixes-5-diagrams.spec.ts
```

Generated timing JSON and screenshots are under `artifacts/performance/` in the fixture test checkout. The repeatable browser tests are committed with the changes.

## Remaining items from the broader brief

Page-phase Server-Timing headers were not added in this pass. Server Components cannot write response headers after streaming begins, so the report uses real browser response timing rather than invented phase values or buffered page responses. Existing round API timing remains available. A page tracing design is a separate instrumentation task.

The proposed 60-second cross-request invite cache was not part of the four approved changes. It would change the existing next-request revocation contract. This pass retains that contract; any later cache must explicitly account for its revocation window.

The locally configured database URL uses the session pooler on port 5432. Vercel identifies the shared Preview/Production value as a protected secret and did not return a readable URL, so its port is unconfirmed. Check that configuration for the transaction pooler on port 6543 before changing it. No environment values were changed.

Cold-start improvements are not claimed from these local tests. The Next file trace for Play contains 327 files totaling 39,727,247 bytes, including 28,605,654 source-map bytes; Mock contains 341 files totaling 39,962,899 bytes, including 28,569,221 source-map bytes. These traces include lazy client assets and are not deployed function zip sizes or proof that every module executes during page startup. No unused server-only imports were identified for removal.

An external uptime monitor could ping the public health endpoint periodically, but that is not a guarantee of warm authenticated-page instances. The current endpoint checks configuration and coordination, not Postgres, so it is not a database warmer. No monitor account, cron, environment update or Production deployment was created in this pass. The broader brief stays active for those remaining decisions.
