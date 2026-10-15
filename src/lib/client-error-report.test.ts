import { describe, expect, it } from "vitest";
import {
  clientErrorMetadata,
  clientErrorReportSchema,
} from "@/lib/client-error-report";

describe("browser error privacy", () => {
  it("keeps only allowlisted categories without message, URL queries or custom error names", () => {
    const error = new Error("candidate private answer");
    error.name = "private error text";
    expect(
      clientErrorMetadata("runtime", "/interview?session=private-id", error),
    ).toEqual({ kind: "runtime", page: "other", errorType: "other" });
    expect(
      clientErrorMetadata("render", "/interview", new TypeError("private")),
    ).toEqual({ kind: "render", page: "/interview", errorType: "TypeError" });
  });
  it("rejects raw error messages, stacks and extra fields", () => {
    const report = {
      kind: "runtime",
      page: "/interview",
      errorType: "Error",
      fingerprint: "a".repeat(64),
    };
    expect(clientErrorReportSchema.safeParse(report).success).toBe(true);
    expect(
      clientErrorReportSchema.safeParse({ ...report, message: "private" })
        .success,
    ).toBe(false);
    expect(
      clientErrorReportSchema.safeParse({ ...report, fingerprint: "raw stack" })
        .success,
    ).toBe(false);
  });
});
