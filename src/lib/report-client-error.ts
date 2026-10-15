"use client";

import {
  clientErrorMetadata,
  type ClientErrorReport,
} from "@/lib/client-error-report";

let reports = 0;
const reported = new Set<string>();

/** Send only a stack fingerprint and allowlisted metadata; never the raw error. */
export async function reportClientError(
  kind: ClientErrorReport["kind"],
  cause: unknown,
): Promise<void> {
  if (process.env.NODE_ENV !== "production" || reports >= 20) return;
  reports++;
  try {
    const metadata = clientErrorMetadata(kind, window.location.pathname, cause);
    const stack =
      cause instanceof Error
        ? cause.stack?.split("\n").slice(1).join("\n") || metadata.errorType
        : typeof cause;
    const hash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(stack),
    );
    const fingerprint = Array.from(new Uint8Array(hash), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    if (reported.has(fingerprint)) return;
    reported.add(fingerprint);
    await fetch("/api/monitoring/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...metadata, fingerprint }),
      keepalive: true,
      signal: AbortSignal.timeout(3_000),
    });
  } catch {
    /* Monitoring must never interrupt the interview. */
  }
}
