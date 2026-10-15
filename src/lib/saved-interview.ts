import { z } from "zod";
import {
  interviewStartSchema,
  type InterviewStart,
} from "@/lib/interview-selection";
import { interviewPhaseSchema } from "@/lib/interview-phase";
import { chatMessageSchema } from "@/lib/chat";
import { sceneSchema } from "@/lib/scene";
import { scorecardSchema, type Scorecard } from "@/lib/scorecard";
import { interviewEndRequestSchema } from "@/lib/interview-end";
import { serverClockOffset } from "@/lib/interview-timer";
import {
  captureWhiteboard,
  type WhiteboardScene,
} from "@/lib/whiteboard-snapshot";

const nativeSceneShape = z.object({
  elements: z.array(
    z
      .object({
        id: z.string().min(1),
        type: z.enum([
          "rectangle",
          "diamond",
          "ellipse",
          "arrow",
          "line",
          "freedraw",
          "text",
          "image",
          "frame",
          "magicframe",
          "embeddable",
          "iframe",
          "selection",
        ]),
        x: z.number().finite(),
        y: z.number().finite(),
        width: z.number().finite(),
        height: z.number().finite(),
      })
      .passthrough(),
  ),
  appState: z.object({
    viewBackgroundColor: z.string(),
    scrollX: z.number().finite().optional(),
    scrollY: z.number().finite().optional(),
    zoom: z.object({ value: z.number().finite().positive() }).optional(),
  }),
  files: z.record(
    z.string(),
    z
      .object({
        id: z.string(),
        dataURL: z.string().startsWith("data:image/"),
        mimeType: z.string(),
        created: z.number(),
      })
      .passthrough(),
  ),
});
// Keep native properties (points, bindings, styles, file contents) rather than the lossy LLM scene.
const nativeSceneSchema = z.custom<WhiteboardScene>(
  (value) => nativeSceneShape.safeParse(value).success,
);
export const savedInterviewSchema = z
  .object({
    version: z.literal(1),
    id: z.uuid(),
    revision: z.uuid(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    clockOffsetMs: z.number().finite().default(0),
    interview: interviewStartSchema,
    phase: interviewPhaseSchema,
    messages: z.array(chatMessageSchema).min(1).max(102),
    whiteboard: nativeSceneSchema,
    previousScene: sceneSchema.optional(),
    previousImageFingerprint: z.string().optional(),
    pacingCapture: z
      .object({ scene: sceneSchema, fingerprint: z.string().optional() })
      .optional(),
    hasEnded: z.boolean(),
    draftText: z.string().max(8_000).default(""),
    endedAt: z.iso.datetime().optional(),
    gradingError: z.string().max(1_000).optional(),
    endRequest: interviewEndRequestSchema.optional(),
    scorecard: scorecardSchema.optional(),
  })
  .refine(
    (saved) =>
      saved.id === saved.interview.sessionId &&
      (!saved.scorecard || saved.hasEnded),
    { message: "Invalid saved interview state" },
  );
export type SavedInterview = z.infer<typeof savedInterviewSchema>;
export type InterviewSaveUpdate = Partial<
  Pick<
    SavedInterview,
    | "phase"
    | "messages"
    | "previousScene"
    | "previousImageFingerprint"
    | "pacingCapture"
    | "hasEnded"
    | "endRequest"
    | "scorecard"
    | "draftText"
    | "endedAt"
    | "gradingError"
  >
> & { resumeToken?: string };
export type SavedInterviewSummary = Pick<
  SavedInterview,
  "id" | "createdAt" | "updatedAt" | "hasEnded"
> & {
  problemId: string;
  level: InterviewStart["level"];
  hasScorecard: boolean;
  signal?: Scorecard["signal"];
  averageScore?: number;
  elapsedSeconds: number;
  timing?: InterviewStart["timing"];
  clockOffsetMs?: number;
  gradingError?: string;
};

export function newSavedInterview(
  interview: InterviewStart,
  scene: WhiteboardScene,
): SavedInterview {
  const now = new Date().toISOString();
  return {
    version: 1,
    id: interview.sessionId,
    revision: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    clockOffsetMs: serverClockOffset(interview.serverTime),
    interview,
    phase: interview.phase,
    messages: [interview.openingMessage],
    whiteboard: captureWhiteboard(scene),
    hasEnded: false,
    draftText: "",
  };
}

export function updateSavedInterview(
  saved: SavedInterview,
  update: InterviewSaveUpdate,
  scene: WhiteboardScene,
): SavedInterview {
  const { resumeToken, ...changes } = update;
  return {
    ...saved,
    ...changes,
    revision: crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
    interview: resumeToken
      ? { ...saved.interview, resumeToken }
      : saved.interview,
    whiteboard: captureWhiteboard(scene),
  };
}

export function savedInterviewSummary(
  saved: SavedInterview,
): SavedInterviewSummary {
  return {
    id: saved.id,
    createdAt: saved.createdAt,
    updatedAt: saved.updatedAt,
    hasEnded: saved.hasEnded,
    timing: saved.interview.timing,
    clockOffsetMs: saved.clockOffsetMs,
    problemId: saved.interview.problemId,
    level: saved.interview.level,
    hasScorecard: Boolean(saved.scorecard),
    signal: saved.scorecard?.signal,
    averageScore: saved.scorecard?.areas.some((area) => area.score !== null)
      ? saved.scorecard.areas.reduce(
          (total, area) => total + (area.score ?? 0),
          0,
        ) / saved.scorecard.areas.filter((area) => area.score !== null).length
      : undefined,
    elapsedSeconds: Math.min(
      saved.scorecard?.session?.allowedSeconds ??
        (saved.interview.timing?.durationMinutes ?? 45) * 60,
      saved.scorecard?.session?.elapsedSeconds ??
        Math.max(
          0,
          Math.round(
            (Date.parse(
              saved.scorecard?.endedAt ?? saved.endedAt ?? saved.updatedAt,
            ) -
              Date.parse(saved.interview.timing?.startedAt ?? saved.createdAt) +
              (saved.interview.timing && !saved.scorecard
                ? saved.clockOffsetMs
                : 0)) /
              1000,
          ),
        ),
    ),
    gradingError: saved.gradingError,
  };
}
