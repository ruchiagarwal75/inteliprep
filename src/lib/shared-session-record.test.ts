import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  sealSharedRecord,
  unsealSharedRecord,
} from "@/lib/shared-session-record";

beforeEach(() => vi.stubEnv("INTERVIEW_RESUME_SECRET", "s".repeat(32)));
afterEach(() => vi.unstubAllEnvs());
describe("encrypted coordination records", () => {
  it("round-trips an opaque checkpoint without revealing it to Redis", () => {
    const record = { resumeToken: "private-checkpoint" };
    const sealed = sealSharedRecord(record);
    expect(sealed).not.toContain(record.resumeToken);
    expect(unsealSharedRecord(sealed)).toEqual(record);
    expect(sealSharedRecord(record)).not.toBe(sealed);
  });
  it("rejects tampering, oversized payloads and key rotation", () => {
    const sealed = sealSharedRecord({ resumeToken: "checkpoint" });
    const [iv, tag, data] = sealed.split(".");
    expect(() =>
      unsealSharedRecord(`${iv}.${tag}.${data.slice(0, -4)}AAAA`),
    ).toThrow();
    expect(() => unsealSharedRecord("a".repeat(200_001))).toThrow();
    vi.stubEnv("INTERVIEW_RESUME_SECRET", "t".repeat(32));
    expect(() => unsealSharedRecord(sealed)).toThrow();
  });
});
