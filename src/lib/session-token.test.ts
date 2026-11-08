import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  sealSession,
  unsealSession,
  endSnapshotHash,
  type SessionCheckpoint,
} from "@/lib/session-token";

beforeEach(() => {
  vi.stubEnv("INTERVIEW_RESUME_SECRET", "test-only-stable-resume-secret");
});
afterEach(() => vi.unstubAllEnvs());
const checkpoint: SessionCheckpoint = {
  id: "00000000-0000-4000-8000-000000000001",
  problemId: "single-server-scaling",
  level: "mid",
  phaseIndex: 2,
  coveredCriteria: [0, 1],
};

describe("opaque server resume checkpoints", () => {
  it.each(["production", "test"])(
    "fails closed without a dedicated secret in %s",
    (environment) => {
      vi.stubEnv("NODE_ENV", environment);
      vi.stubEnv("INTERVIEW_RESUME_SECRET", "");
      vi.stubEnv("OPENAI_KEY", "a-provider-key-is-not-a-resume-secret");
      expect(() => sealSession(checkpoint)).toThrow("INTERVIEW_RESUME_SECRET");
    },
  );
  it("uses a stable local development constant only on a local development server", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("INTELIPREP_ENV", "");
    vi.stubEnv("INTERVIEW_RESUME_SECRET", "");
    const token = sealSession(checkpoint);
    vi.stubEnv("OPENAI_KEY", "rotated-provider-key");
    expect(unsealSession(token)).toEqual(checkpoint);
    vi.stubEnv("VERCEL", "1");
    expect(() => unsealSession(token)).toThrow("INTERVIEW_RESUME_SECRET");
  });
  it("round-trips authenticated progress without exposing readable coverage or credentials", () => {
    const token = sealSession(checkpoint);
    expect(unsealSession(token)).toEqual(checkpoint);
    expect(token).not.toContain("coveredCriteria");
    expect(token).not.toContain("test-only-stable");
    expect(sealSession(checkpoint)).not.toBe(token);
  });
  it("rejects modified bytes and tokens issued with a different secret", () => {
    const token = sealSession(checkpoint);
    const parts = token.split(".");
    const data = Buffer.from(parts[2], "base64url");
    data[0] ^= 1;
    parts[2] = data.toString("base64url");
    expect(() => unsealSession(parts.join("."))).toThrow();
    vi.stubEnv("INTERVIEW_RESUME_SECRET", "another-secret");
    expect(() => unsealSession(token)).toThrow();
  });
  it.each(["invalid", "a.b.c", "a".repeat(8_001)])(
    "rejects malformed tokens",
    (token) => {
      expect(() => unsealSession(token)).toThrow();
    },
  );
  it("binds ended checkpoints to exactly the original grading evidence", () => {
    const snapshot = {
      messages: [
        { role: "user" as const, content: "I added a load balancer." },
      ],
    };
    const ending = {
      endedAt: "2026-10-12T00:00:00.000Z",
      snapshotHash: endSnapshotHash(snapshot),
    };
    expect(
      unsealSession(sealSession({ ...checkpoint, ending })).ending,
    ).toEqual(ending);
    expect(endSnapshotHash(structuredClone(snapshot))).toBe(
      ending.snapshotHash,
    );
    expect(
      endSnapshotHash({
        messages: [{ role: "user", content: "Another answer" }],
      }),
    ).not.toBe(ending.snapshotHash);
  });
});
