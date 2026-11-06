import type { ChatMessage } from "@/lib/chat";
import { candidateEchoRemover } from "@/lib/candidate-echo";

export function removeCandidateEcho(text: string, messages: ChatMessage[]) {
  return candidateEchoRemover(
    messages
      .filter(
        (message) => message.role === "user" && message.source !== "control",
      )
      .map((message) => plainInterviewerText(message.content)),
  )(text);
}

/** Chat bubbles use text, so model formatting never becomes literal markup. */
export function plainInterviewerText(text: string): string {
  return text
    .replace(/^\s*(?:#{1,6}\s+|\d+[.)](?:\s+|$)|[-*+]\s+)/gmu, "")
    .replace(/\*\*([^*\n]+)\*\*|__([^_\n]+)__/gu, "$1$2")
    .replace(/`([^`\n]+)`/gu, "$1")
    .replace(/(?<!\w)\*([^*\n]+)\*/gu, "$1")
    .replaceAll("**", "")
    .replaceAll("__", "")
    .replaceAll("`", "")
    .replace(/\[([^\]]+)\]\([^)]+\)/gu, "$1")
    .trim();
}

/** Release complete phrases incrementally; discard every question after the first. */
export function interviewerReplyFilter(messages: ChatMessage[] = []) {
  const removeEcho = candidateEchoRemover(
    messages
      .filter(
        (message) => message.role === "user" && message.source !== "control",
      )
      .map((message) => plainInterviewerText(message.content)),
  );
  let buffer = "";
  let finished = false;
  let emitted = false;
  function take(text: string) {
    if (finished) return "";
    const plain = removeEcho(plainInterviewerText(text));
    // Standalone model headings add no interview content.
    if (!plain || /^[^.!?？\n]+:$/u.test(plain)) return "";
    const question = plain.search(/[?？]/u);
    const result = question < 0 ? plain : plain.slice(0, question + 1);
    if (question >= 0) finished = true;
    const prefix = emitted ? " " : "";
    emitted = true;
    return prefix + result;
  }
  return {
    push(chunk: string) {
      if (finished) return "";
      buffer += chunk;
      let result = "";
      for (;;) {
        const quoted = /^\s*(["“])/u.exec(buffer);
        if (quoted) {
          const start = buffer.indexOf(quoted[1]);
          const end = buffer.indexOf(quoted[1] === "“" ? "”" : '"', start + 1);
          if (end < 0) break;
          const passage = buffer.slice(0, end + 1);
          if (!removeEcho(plainInterviewerText(passage))) {
            buffer = buffer.slice(end + 1);
            continue;
          }
        }
        const boundary = /[?？]|[.!](?=\s)|\n/u.exec(buffer);
        if (!boundary) break;
        const end = boundary.index + boundary[0].length;
        result += take(buffer.slice(0, end));
        buffer = buffer.slice(end);
        if (finished) break;
      }
      return result;
    },
    finish() {
      const result = take(buffer);
      buffer = "";
      return result;
    },
  };
}
