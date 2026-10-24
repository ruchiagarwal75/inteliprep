import { afterEach, describe, expect, it, vi } from "vitest";
import {
  serializeSharedRecord,
  parseSharedRecord,
  type SharedSessionRecord,
} from "@/lib/shared-session-record";
import {
  scorecardFixture,
  gradingSelection,
} from "@/lib/fixtures/scorecard-test";
import { legacySessionRecordFixture } from "@/lib/fixtures/legacy-session-record-test";

afterEach(() => vi.unstubAllEnvs());
const checkpoint = {
  ...gradingSelection,
  id: "11111111-1111-4111-8111-111111111111",
  phaseIndex: 1,
  coveredCriteria: [0],
  timing: {
    startedAt: "2026-10-23T10:00:00.000Z",
    deadlineAt: "2026-10-23T10:45:00.000Z",
    durationMinutes: 45 as const,
  },
};
const record: SharedSessionRecord = { checkpoint };

describe("JSON coordination records", () => {
  it("stores readable progress and cached feedback without a Redis encryption key", () => {
    vi.stubEnv("INTERVIEW_RESUME_SECRET", "");
    const saved = { ...record, scorecard: scorecardFixture() };
    const value = serializeSharedRecord(saved);
    expect(JSON.parse(value)).toEqual(saved);
    expect(value).toContain('"phaseIndex":1');
    expect(value).toContain("CPU");
    expect(value).not.toContain("resumeToken");
    expect(parseSharedRecord(value)).toEqual(saved);
    vi.stubEnv("INTERVIEW_RESUME_SECRET", "different-secret");
    expect(parseSharedRecord(value)).toEqual(saved);
  });

  it("validates progress and feedback and keeps full evidence out of the stored record", () => {
    const input = {
      ...record,
      transcript: "full answers",
      diagramImage: "PNG bytes",
    };
    expect(JSON.parse(serializeSharedRecord(input))).toEqual(record);
    expect(() => parseSharedRecord('{"checkpoint":')).toThrow();
    expect(() => parseSharedRecord("{}")).toThrow();
    expect(() =>
      parseSharedRecord(
        JSON.stringify({
          checkpoint: { ...checkpoint, phaseIndex: -1 },
        }),
      ),
    ).toThrow();
    expect(() =>
      parseSharedRecord(JSON.stringify({ ...record, scorecard: {} })),
    ).toThrow();
    expect(() => parseSharedRecord("a".repeat(200_001))).toThrow();
    const oversized = scorecardFixture();
    oversized.areas = Array.from({ length: 2_000 }, () => oversized.areas[0]);
    expect(() =>
      serializeSharedRecord({ ...record, scorecard: oversized }),
    ).toThrow();
  });

  it("reads old encrypted progress/feedback and rewrites it as JSON", () => {
    vi.stubEnv("INTERVIEW_RESUME_SECRET", "s".repeat(32));
    const saved = { ...record, scorecard: scorecardFixture() };
    const legacy = legacySessionRecordFixture(saved);
    const recovered = parseSharedRecord(legacy);
    expect(recovered).toEqual(saved);
    const rewritten = serializeSharedRecord(recovered);
    expect(JSON.parse(rewritten)).toEqual(saved);
  });

  it("rejects damaged legacy records or an incorrect legacy decryption key", () => {
    vi.stubEnv("INTERVIEW_RESUME_SECRET", "s".repeat(32));
    const legacy = legacySessionRecordFixture(record);
    const [iv, tag, data] = legacy.split(".");
    expect(() =>
      parseSharedRecord(`${iv}.${tag}.${data.slice(0, -4)}AAAA`),
    ).toThrow();
    vi.stubEnv("INTERVIEW_RESUME_SECRET", "t".repeat(32));
    expect(() => parseSharedRecord(legacy)).toThrow();
    vi.stubEnv("INTERVIEW_RESUME_SECRET", "");
    expect(() => parseSharedRecord(legacy)).toThrow();
  });
});
