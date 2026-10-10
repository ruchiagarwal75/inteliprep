import OpenAI from "openai";
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

export class MissingApiKeyError extends Error {
  constructor() {
    super("OPENAI_KEY is not set");
    this.name = "MissingApiKeyError";
  }
}

/** Reads config lazily so importing this module never throws at build time. */
function createClient(): OpenAI {
  const apiKey = process.env.OPENAI_KEY;
  if (!apiKey) throw new MissingApiKeyError();
  return new OpenAI({ apiKey });
}

export function hasApiKey(): boolean {
  return Boolean(process.env.OPENAI_KEY);
}

const model = () => process.env.OPENAI_MODEL ?? "gpt-4o";

/** Streams the interviewer's reply as plain text deltas. */
export async function* streamInterviewerReply(
  messages: ChatMessage[],
  diagramText: string,
  changeText: string,
  signal?: AbortSignal,
  diagramImage?: string,
  interview?: InterviewContext,
): AsyncGenerator<string> {
  const stream = await createClient().responses.create(
    {
      model: model(),
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
  const drawingReply =
    step === "invite-drawing" || step === "drawing" || step === "explaining";
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
    else if (!reply)
      yield step === "explaining" ? EXPLANATION_WAIT_REPLY : DRAWING_WAIT_REPLY;
  }
}
