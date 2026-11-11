import "server-only";
import {
  reportingContext,
  withReportingContext,
} from "@/lib/reporting-context";
import { logServerEvent } from "@/lib/server-events";
/** Reward/analytics failures must not be mistaken for a failed Mock scorecard. */
export function logPlayFailure(kind: string, cause: unknown) {
  const context = reportingContext();
  withReportingContext(
    { ...context, requestId: context?.requestId ?? "play", route: "/api/play" },
    () =>
      logServerEvent(
        { event: "api_failure", route: "/api/play", kind, status: 503 },
        cause,
      ),
  );
}
