import OpenAI from "openai";
import type { ChatMessage } from "@/lib/chat";
import {
  buildInterviewerInput,
  INTERVIEWER_INSTRUCTIONS,
} from "@/lib/interviewer-input";

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
): AsyncGenerator<string> {
  const stream = await createClient().responses.create(
    {
      model: model(),
      instructions: INTERVIEWER_INSTRUCTIONS,
      input: buildInterviewerInput(messages, diagramText, changeText),
      stream: true,
    },
    { signal },
  );

  for await (const event of stream) {
    if (
      event.type === "response.failed" ||
      event.type === "response.incomplete"
    ) {
      throw new Error(
        "The interviewer reply did not complete. Please try again.",
      );
    }
    if (event.type === "response.output_text.delta") yield event.delta;
  }
}
