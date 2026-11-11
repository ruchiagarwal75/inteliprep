import { z } from "zod";

export const LIKED_CHOICES = [
  ["loved", "Loved it"],
  ["okay", "It was okay"],
  ["not_for_me", "Not for me"],
] as const;
export const RETURN_CHOICES = [
  ["yes", "Yes"],
  ["maybe", "Maybe"],
  ["no", "No"],
] as const;
export const INPUT_PREFERENCE_CHOICES = [
  ["talk", "Talk"],
  ["type", "Type"],
  ["no_preference", "No preference"],
] as const;

export const practiceFeedbackSchema = z
  .strictObject({
    interviewId: z.uuid().optional(),
    source: z.enum(["interview_end", "menu"]),
    skipped: z.boolean(),
    liked: z.enum(["loved", "okay", "not_for_me"]).optional(),
    wouldReturn: z.enum(["yes", "maybe", "no"]).optional(),
    inputPreference: z.enum(["talk", "type", "no_preference"]).optional(),
    comment: z.string().trim().max(2000).optional(),
  })
  .superRefine((value, context) => {
    if (
      !value.skipped &&
      !value.liked &&
      !value.wouldReturn &&
      !value.inputPreference &&
      !value.comment
    )
      context.addIssue({
        code: "custom",
        message: "Choose an answer or write a comment.",
      });
    if ((value.source === "interview_end") !== Boolean(value.interviewId))
      context.addIssue({
        code: "custom",
        message: "Check the feedback source and interview.",
      });
  });

export type PracticeFeedbackInput = z.infer<typeof practiceFeedbackSchema>;
export type PracticeFeedbackRecord = {
  id: string;
  userId: string;
  interviewId: string | null;
  source: "interview_end" | "menu";
  skipped: boolean;
  liked: PracticeFeedbackInput["liked"] | null;
  wouldReturn: PracticeFeedbackInput["wouldReturn"] | null;
  inputPreference?: PracticeFeedbackInput["inputPreference"] | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
};
