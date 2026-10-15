import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { z } from "zod";
import { scorecardSchema } from "@/lib/scorecard";

const recordSchema = z.object({
  resumeToken: z.string().min(1).max(8_000),
  scorecard: scorecardSchema.optional(),
});
export type SharedSessionRecord = z.infer<typeof recordSchema>;
const CONTEXT = "inteliprep/shared-session/v1";

function key() {
  const secret = process.env.INTERVIEW_RESUME_SECRET;
  if (!secret) throw new Error("Missing session secret");
  return createHash("sha256").update(CONTEXT).update(secret).digest();
}

/** Redis never receives a transcript or PNG. Cached feedback is encrypted too. */
export function sealSharedRecord(record: SharedSessionRecord): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(CONTEXT));
  const data = Buffer.concat([
    cipher.update(JSON.stringify(recordSchema.parse(record)), "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), data]
    .map((part) => part.toString("base64url"))
    .join(".");
}

export function unsealSharedRecord(value: string): SharedSessionRecord {
  if (value.length > 200_000) throw new Error("Invalid shared session");
  const parts = value.split(".");
  if (parts.length !== 3 || parts.some((part) => !/^[\w-]+$/.test(part)))
    throw new Error("Invalid shared session");
  const [iv, tag, data] = parts.map((part) => Buffer.from(part, "base64url"));
  if (iv.length !== 12 || tag.length !== 16)
    throw new Error("Invalid shared session");
  const cipher = createDecipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(CONTEXT));
  cipher.setAuthTag(tag);
  return recordSchema.parse(
    JSON.parse(
      Buffer.concat([cipher.update(data), cipher.final()]).toString("utf8"),
    ),
  );
}
