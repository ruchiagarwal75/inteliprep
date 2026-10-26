import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { z } from "zod";
import { interviewSelectionSchema } from "@/lib/interview-selection";
import type { InterviewEndSnapshot } from "@/lib/interview-end";
import { interviewTimingSchema } from "@/lib/interview-timer";

export const sessionCheckpointSchema = interviewSelectionSchema.extend({
  id: z.uuid(),
  ownerUserId: z.uuid().optional(),
  timing: interviewTimingSchema.optional(),
  phaseIndex: z.number().int().min(0).max(9),
  coveredCriteria: z.array(z.number().int().min(0).max(30)).max(30),
  ending: z
    .object({
      endedAt: z.iso.datetime(),
      snapshotHash: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .optional(),
});
export type SessionCheckpoint = z.infer<typeof sessionCheckpointSchema>;
const state = globalThis as typeof globalThis & {
  inteliprepResumeKey?: string;
};
const CONTEXT = "inteliprep/browser-resume/v1";

function key() {
  // A dedicated secret can decouple checkpoints from provider-key rotation.
  // No provider key or private stage criteria are included in the token.
  const secret =
    process.env.INTERVIEW_RESUME_SECRET ||
    process.env.OPENAI_KEY ||
    (state.inteliprepResumeKey ??= randomBytes(32).toString("hex"));
  return createHash("sha256").update(CONTEXT).update(secret).digest();
}

/** Authenticated encryption keeps private progress opaque and rejects edited checkpoints. */
export function sealSession(checkpoint: SessionCheckpoint): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(CONTEXT));
  const ciphertext = Buffer.concat([
    cipher.update(
      JSON.stringify(sessionCheckpointSchema.parse(checkpoint)),
      "utf8",
    ),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), ciphertext]
    .map((part) => part.toString("base64url"))
    .join(".");
}

export function unsealSession(token: string): SessionCheckpoint {
  if (token.length > 8_000) throw new Error("Invalid resume checkpoint");
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => !/^[\w-]+$/.test(part)))
    throw new Error("Invalid resume checkpoint");
  const [iv, tag, data] = parts.map((part) => Buffer.from(part, "base64url"));
  if (iv.length !== 12 || tag.length !== 16)
    throw new Error("Invalid resume checkpoint");
  const cipher = createDecipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(CONTEXT));
  cipher.setAuthTag(tag);
  return sessionCheckpointSchema.parse(
    JSON.parse(
      Buffer.concat([cipher.update(data), cipher.final()]).toString("utf8"),
    ),
  );
}

export function endSnapshotHash(snapshot: InterviewEndSnapshot): string {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}
