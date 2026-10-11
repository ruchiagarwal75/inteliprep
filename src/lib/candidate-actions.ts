import { z } from "zod";

/** Candidate pacing controls, never arbitrary interviewer instructions. */
export const candidateActionSchema = z.enum(["draw", "explain", "review"]);
export type CandidateAction = z.infer<typeof candidateActionSchema>;

/** One contextual control gives the candidate the floor, then opens questions. */
export function designDiscussionControl(action?: CandidateAction): {
  action: CandidateAction;
  label: string;
  message: string;
} {
  if (action === "explain")
    return {
      action: "review",
      label: "Done explaining",
      message: "I've finished explaining. Let's discuss my design.",
    };
  return {
    action: "explain",
    label: action === "review" ? "Explain an update" : "Explain my design",
    message:
      "I'm ready to explain my design. Please let me finish before asking questions.",
  };
}

type ActionMessage = {
  role: string;
  content: string;
  action?: CandidateAction;
};

/** Recognize explicit readiness/pause requests; ordinary design prose stays data. */
export function inferCandidateAction(
  content: string,
): CandidateAction | undefined {
  const text = content.trim().toLowerCase().replaceAll("’", "'");
  if (
    /^(?:please\s+)?(?:pause\b|wait\b|hold on\b|give me (?:a moment|some time|time|a break)\b|(?:don't|do not) (?:ask|review)\b|let me (?:draw|finish|keep drawing|take a break)\b)/u.test(
      text,
    ) ||
    /^(?:i'm|i am|i) (?:still (?:drawing|working)|not (?:done|finished|ready)|need (?:some )?(?:time|a moment|a break)|want to (?:draw|keep drawing|take a break))\b/u.test(
      text,
    )
  )
    return "draw";
  if (
    /^(?:please )?(?:review|discuss|critique) (?:my|the|this) (?:drawing|diagram|sketch|design|architecture)\b/u.test(
      text,
    ) ||
    /^(?:can|could) you (?:please )?(?:review|discuss) (?:my|the|this) (?:drawing|diagram|sketch|design|architecture)\b/u.test(
      text,
    ) ||
    /^(?:let's|let us) (?:discuss|review|take questions)\b/u.test(text) ||
    /^(?:i'm|i am) ready (?:for (?:questions|feedback|review)|to (?:discuss|take questions))\b/u.test(
      text,
    ) ||
    /^(?:i'm|i am) (?:done|finished) (?:explaining|with my explanation)\b/u.test(
      text,
    ) ||
    /^(?:i've|i have) (?:finished|completed) (?:my )?(?:explanation|explaining)\b/u.test(
      text,
    ) ||
    /^that's my explanation\b/u.test(text) ||
    /^(?:done|finished) explaining[.!\s]*$/u.test(text)
  )
    return "review";
  if (
    /^(?:i'm|i am) (?:ready to explain|done(?: drawing)?|finished(?: drawing)?|still explaining)\b/u.test(
      text,
    ) ||
    /^(?:i've|i have) (?:finished|completed) (?:my )?(?:drawing|diagram|sketch)\b/u.test(
      text,
    ) ||
    /^(?:let me explain|here(?:'s| is) my explanation)\b/u.test(text) ||
    /^(?:done|ready)[.!\s]*$/u.test(text) ||
    /^explain (?:my (?:design|drawing)|an update)[.!\s]*$/u.test(text)
  )
    return "explain";
  return undefined;
}

/** A pause or explanation remains active through subsequent ordinary messages. */
export function lastCandidateAction(
  messages: readonly ActionMessage[],
): CandidateAction | undefined {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (message.role !== "user") continue;
    const action = message.action ?? inferCandidateAction(message.content);
    if (action) return action;
  }
  return undefined;
}

/** Editing during review gives the floor back to the candidate, until they opt in. */
export function actionForTurn(
  content: string,
  requestedAction: CandidateAction | undefined,
  currentAction: CandidateAction | undefined,
  drawingChanged: boolean,
): CandidateAction | undefined {
  return (
    requestedAction ??
    inferCandidateAction(content) ??
    (currentAction === "review" && drawingChanged ? "draw" : undefined)
  );
}
