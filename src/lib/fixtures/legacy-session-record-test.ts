import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { sealSession } from "@/lib/session-token";
import type { SharedSessionRecord } from "@/lib/shared-session-record";

/** The old Redis wire format, used only to exercise read compatibility. */
export function legacySessionRecordFixture(
  record: SharedSessionRecord,
): string {
  const secret = process.env.INTERVIEW_RESUME_SECRET;
  if (!secret) throw new Error("Missing test secret");
  const context = "inteliprep/shared-session/v1";
  const key = createHash("sha256").update(context).update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(context));
  const data = Buffer.concat([
    cipher.update(
      JSON.stringify({
        resumeToken: sealSession(record.checkpoint),
        scorecard: record.scorecard,
      }),
      "utf8",
    ),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), data]
    .map((part) => part.toString("base64url"))
    .join(".");
}
