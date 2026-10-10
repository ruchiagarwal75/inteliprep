import "server-only";
import type { ChatMessage } from "@/lib/chat";
import type { ProblemDefinition } from "@/lib/problems";
import type { Scene } from "@/lib/scene";
import {
  inferCandidateAction,
  lastCandidateAction,
} from "@/lib/candidate-actions";
import { hasSketch } from "@/lib/drawing-state";

export type InterviewProgress = {
  step: "discussion" | "invite-drawing" | "drawing" | "explaining" | "review";
  candidateTurns: number;
  discussionTurnLimit: number;
};

/** The server derives progress from bounded candidate controls and drawing data. */
export function getInterviewProgress(
  problem: ProblemDefinition,
  messages: ChatMessage[],
  scene?: Scene,
  previousScene?: Scene,
): InterviewProgress {
  const candidateTurns = messages.filter(
    (message) => message.role === "user",
  ).length;
  const discussionTurnLimit = problem.drawingPolicy.discussionTurns;
  const invited = messages.some(
    (message) =>
      message.role === "assistant" &&
      message.content.trim().endsWith(problem.drawingPolicy.invitation),
  );
  const action = lastCandidateAction(messages);
  const latestUser = messages.findLast((message) => message.role === "user");
  const latestAction =
    latestUser &&
    (latestUser.action ?? inferCandidateAction(latestUser.content));
  const editedDuringReview =
    action === "review" &&
    !latestAction &&
    scene &&
    previousScene &&
    JSON.stringify(scene) !== JSON.stringify(previousScene);
  let step: InterviewProgress["step"] = "discussion";
  if (action === "draw" || editedDuringReview) step = "drawing";
  else if (action === "explain") step = "explaining";
  else if (action === "review") step = "review";
  else if (hasSketch(scene?.elements) || hasSketch(previousScene?.elements))
    step = "drawing";
  else if (invited) step = "drawing";
  else if (candidateTurns >= discussionTurnLimit) step = "invite-drawing";
  return { step, candidateTurns, discussionTurnLimit };
}

export function drawingStepInstructions(progress: InterviewProgress): string {
  switch (progress.step) {
    case "discussion":
      return "Keep the initial discussion brief and clarify only what is needed to begin a sketch. Do not get stuck probing implementation details before a drawing. The candidate may start drawing at any time.";
    case "invite-drawing":
      return "The initial discussion is over and it is time to draw. In under 30 words, answer the latest clarification using configured facts, or acknowledge the candidate's last answer. Do not ask another question, begin a deep dive, or include a drawing invitation yourself: the application will append the configured invitation to your reply.";
    case "drawing":
      return "The candidate is drawing, revising, or taking a break. A nonempty whiteboard may be a partial sketch, not a finished design. Give them time to draw and explain afterwards. Answer an explicit factual clarification briefly if they ask one; otherwise give a brief acknowledgement that you will wait. Do not critique the sketch, request a walkthrough, or ask requirements, estimation, or design questions. Do not direct their next design decision. End this reply without a question. Only claim to see a drawing if the current snapshot contains one. Wait for the candidate to explicitly choose explanation or discussion.";
    case "explaining":
      return "The candidate has the floor to explain their drawing across as many messages as they need. Listen and briefly acknowledge their explanation without evaluating it. Answer an explicit factual clarification if asked. Do not interrupt with questions, critiques, suggested components, or requests to explain more. Do not assume one message completes the explanation. End this reply without a question. Wait until the candidate explicitly asks for discussion, review, or questions.";
    case "review":
      return "The candidate has explicitly invited discussion after drawing and explaining. Discuss their explanation and current sketch; ask at most one focused diagram follow-up. Give them space to answer and update the whiteboard. If they ask for time to draw or explain, hold questions. Do not restart the initial discussion. Do not assume an empty or missing current snapshot contains a drawing.";
  }
}
