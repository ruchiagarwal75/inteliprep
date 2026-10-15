import { z } from "zod";

export const clientErrorReportSchema = z.strictObject({
  kind: z.enum(["runtime", "unhandled_rejection", "render", "storage"]),
  page: z.enum(["/", "/interview", "other"]),
  errorType: z.enum([
    "Error",
    "TypeError",
    "RangeError",
    "AbortError",
    "other",
  ]),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
});
export type ClientErrorReport = z.infer<typeof clientErrorReportSchema>;

export function clientErrorMetadata(
  kind: ClientErrorReport["kind"],
  path: string,
  cause: unknown,
): Omit<ClientErrorReport, "fingerprint"> {
  const name = cause instanceof Error ? cause.name : "other";
  return {
    kind,
    page: path === "/" || path === "/interview" ? path : "other",
    errorType:
      name === "Error" ||
      name === "TypeError" ||
      name === "RangeError" ||
      name === "AbortError"
        ? name
        : "other",
  };
}
