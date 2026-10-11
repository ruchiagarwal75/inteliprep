import "server-only";
import OpenAI from "openai";

export class MissingApiKeyError extends Error {
  constructor() {
    super("OPENAI_KEY is not set");
    this.name = "MissingApiKeyError";
  }
}
export function hasApiKey(): boolean {
  return Boolean(process.env.OPENAI_KEY);
}
export const interviewerModel = () => process.env.OPENAI_MODEL ?? "gpt-4o";

/** Read credentials lazily so imports remain safe during build and tests. */
export function createOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_KEY;
  if (!apiKey) throw new MissingApiKeyError();
  return new OpenAI({ apiKey });
}
