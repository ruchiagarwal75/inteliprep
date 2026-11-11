import "server-only";
import { normalizeQuestionKeys } from "@/lib/normalize-question-keys";
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
import { pendingQuestionSchema } from "@/lib/open-question-queue";

export const sessionCheckpointSchema = interviewSelectionSchema
  .extend({
    id: z.uuid(),
    ownerUserId: z.uuid().optional(),
    timing: interviewTimingSchema.optional(),
    phaseEnteredAt: z.iso.datetime().optional(),
    openQuestion: z.string().max(1200).optional(),
    openQuestions: z.array(pendingQuestionSchema).max(8).optional(),
    pendingDiagramComponents: z.array(z.string().max(1000)).max(12).optional(),
    topicTurnCounts: z
      .record(z.string().max(256), z.number().int().min(0).max(100))
      .refine((value) => Object.keys(value).length <= 50)
      .optional(),
    answeredStages: z.array(z.number().int().min(0).max(9)).max(10).optional(),
    coveredTopics: z.array(z.string().max(500)).max(40).optional(),
    phaseIndex: z.number().int().min(0).max(9),
    coveredCriteria: z.array(z.number().int().min(0).max(30)).max(30),
    ending: z
      .object({
        endedAt: z.iso.datetime(),
        snapshotHash: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .optional(),
  })
  .transform((checkpoint) => ({
    ...checkpoint,
    ...normalizeQuestionKeys(checkpoint),
  }));
export type SessionCheckpoint = z.infer<typeof sessionCheckpointSchema>;
const CONTEXT = "inteliprep/browser-resume/v1";
const LOCAL_DEVELOPMENT_RESUME_SECRET =
  "mockmeai-local-development-resume-secret-not-for-deployment";

function key() {
  const secret =
    process.env.INTERVIEW_RESUME_SECRET ||
    (process.env.NODE_ENV === "development" &&
    process.env.VERCEL !== "1" &&
    process.env.INTELIPREP_ENV !== "beta"
      ? LOCAL_DEVELOPMENT_RESUME_SECRET
      : undefined);
  if (!secret)
    throw new Error(
      "INTERVIEW_RESUME_SECRET is required outside local development",
    );
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
