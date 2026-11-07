import "server-only";
import { after } from "next/server";
import { reportingConfigured } from "@/lib/reporting-db";
import { reportingContext } from "@/lib/reporting-context";

let unavailableUntil = 0;

/** Observability must never change the result of an interview operation. */
export async function safeReporting(
  work: () => Promise<unknown>,
): Promise<void> {
  if (!reportingConfigured() || Date.now() < unavailableUntil) return;
  try {
    await work();
  } catch {
    unavailableUntil = Date.now() + 30_000;
    console.error(
      JSON.stringify({
        event: "reporting_failure",
        timestamp: new Date().toISOString(),
        requestId: reportingContext()?.requestId,
      }),
    );
  }
}
export function deferReporting(work: () => Promise<unknown>) {
  if (!reportingConfigured()) return;
  // Next keeps the request alive for this bounded write, including on Vercel.
  try {
    after(() => safeReporting(work));
  } catch {
    void safeReporting(work);
  }
}
