import type { ChatMessage } from "@/lib/chat";
import {
  buildInterviewerInput,
  INTERVIEWER_INSTRUCTIONS,
} from "@/lib/interviewer-input";
import {
  buildInterviewInstructions,
  type InterviewContext,
} from "@/lib/interview-instructions";
import {
  withoutQuestions,
  DRAWING_WAIT_REPLY,
  EXPLANATION_WAIT_REPLY,
} from "@/lib/drawing-reply";

import { createOpenAIClient, interviewerModel } from "@/lib/openai-client";
export { MissingApiKeyError, hasApiKey } from "@/lib/openai-client";

/** Streams the interviewer's reply as plain text deltas. */
export async function* streamInterviewerReply(
  messages: ChatMessage[],
  diagramText: string,
  changeText: string,
  signal?: AbortSignal,
  diagramImage?: string,
  interview?: InterviewContext,
): AsyncGenerator<string> {
  const stream = await createOpenAIClient().responses.create(
    {
      model: interviewerModel(),
      instructions: interview
        ? buildInterviewInstructions(interview)
        : INTERVIEWER_INSTRUCTIONS,
      input: buildInterviewerInput(
        messages,
        diagramText,
        changeText,
        diagramImage,
      ),
      stream: true,
    },
    { signal },
  );

  const step = interview?.progress?.step;
  const closing =
    interview?.phase?.transition === "wrap-up" && step === "review";
  const drawingReply =
    closing ||
    step === "invite-drawing" ||
    step === "drawing" ||
    step === "explaining";
  let bufferedReply = "";
  let completed = false;
  for await (const event of stream) {
    if (
      event.type === "response.failed" ||
      event.type === "response.incomplete"
    ) {
      throw new Error(
        "The interviewer reply did not complete. Please try again.",
      );
    }
    if (event.type === "response.completed") completed = true;
    if (event.type === "response.output_text.delta") {
      if (drawingReply) bufferedReply += event.delta;
      else yield event.delta;
    }
  }
  if (!completed)
    throw new Error(
      "The interviewer reply did not complete. Please try again.",
    );
  if (drawingReply) {
    const reply = withoutQuestions(bufferedReply);
    if (reply) yield reply;
    if (step === "invite-drawing" && interview)
      yield `${reply ? "\n\n" : ""}${interview.problem.drawingPolicy.invitation}`;
    else if (!reply && closing)
      yield "Thanks for walking through your design and its tradeoffs.";
    else if (!reply)
      yield step === "explaining" ? EXPLANATION_WAIT_REPLY : DRAWING_WAIT_REPLY;
  }
}
