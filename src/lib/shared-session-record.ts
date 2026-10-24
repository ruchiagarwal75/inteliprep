import "server-only";
import { createDecipheriv, createHash } from "node:crypto";
import { z } from "zod";
import { scorecardSchema } from "@/lib/scorecard";
import { sessionCheckpointSchema, unsealSession } from "@/lib/session-token";

const recordSchema = z.object({
  checkpoint: sessionCheckpointSchema,
  scorecard: scorecardSchema.optional(),
});
export type SharedSessionRecord = z.infer<typeof recordSchema>;
const MAX_RECORD_LENGTH = 200_000;

/** Store validated progress/feedback directly as JSON, without transcripts or PNGs. */
export function serializeSharedRecord(record: SharedSessionRecord): string {
  const value = JSON.stringify(recordSchema.parse(record));
  if (value.length > MAX_RECORD_LENGTH)
    throw new Error("Invalid shared session");
  return value;
}

export function parseSharedRecord(value: string): SharedSessionRecord {
  if (value.length > MAX_RECORD_LENGTH)
    throw new Error("Invalid shared session");
  return recordSchema.parse(
    value.trimStart().startsWith("{")
      ? JSON.parse(value)
      : readLegacyRecord(value),
  );
}

/** Read compatibility only: existing encrypted entries become JSON on the next save. */
function readLegacyRecord(value: string): SharedSessionRecord {
  const context = "inteliprep/shared-session/v1";
  const secret = process.env.INTERVIEW_RESUME_SECRET;
  if (!secret) throw new Error("Missing session secret");
  const parts = value.split(".");
  if (parts.length !== 3 || parts.some((part) => !/^[\w-]+$/.test(part)))
    throw new Error("Invalid shared session");
  const [iv, tag, data] = parts.map((part) => Buffer.from(part, "base64url"));
  if (iv.length !== 12 || tag.length !== 16)
    throw new Error("Invalid shared session");
  const key = createHash("sha256").update(context).update(secret).digest();
  const cipher = createDecipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(context));
  cipher.setAuthTag(tag);
  const legacy = z
    .object({
      resumeToken: z.string().min(1).max(8_000),
      scorecard: scorecardSchema.optional(),
    })
    .parse(
      JSON.parse(
        Buffer.concat([cipher.update(data), cipher.final()]).toString("utf8"),
      ),
    );
  return {
    checkpoint: unsealSession(legacy.resumeToken),
    scorecard: legacy.scorecard,
  };
}
