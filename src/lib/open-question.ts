import type { ChatMessage } from "@/lib/chat";

export function questionAtEnd(reply: string) {
  return reply.match(/[^.!?\n]*[?？]\s*$/u)?.[0].trim();
}
export function hasExplanation(messages: ChatMessage[]) {
  const start = messages.findLastIndex(
    (m) => m.role === "user" && m.action === "explain",
  );
  return messages
    .slice(start < 0 ? 0 : start)
    .some(
      (m) =>
        m.role === "user" &&
        m.source !== "control" &&
        (!m.action || m.action === "explain") &&
        m.content.trim().length > 0,
    );
}
export function hasAsk(reply: string) {
  if (/[?？]\s*$/u.test(reply)) return true;
  const ending =
    reply
      .trim()
      .split(/(?<=[.!?])\s+|\n+/u)
      .at(-1) ?? "";
  return /^(?:(?:yes|okay|ok|sure)[,!.]?\s+)?(?:please\b|feel free to\b|you can\b|choose\b|draw\b|sketch\b|explain\b|walk\b|end the interview\b|keep\b|take your time\b|go ahead\b|let.s stay on your design\b|continue\b|describe\b|tell me\b|review\b|confirm\b|clarify\b)/iu.test(
    ending,
  );
}

/** A handoff is an instruction, never an invitation to answer another question. */
export function invitesDrawing(reply: string) {
  return /\b(?:start|begin|continue|go ahead (?:and|with)|feel free to)\s+(?:(?:your|the)\s+)?(?:draw(?:ing)?|sketch(?:ing)?|designing)\b|\b(?:start|begin) (?:your |the )?(?:design|approach|architecture) by (?:drawing|sketching)\b|(?:^|[.!,:]\s*)(?:please )?(?:draw|sketch)\b|\b(?:move|turn) to (?:the |your )?whiteboard\b/iu.test(
    reply,
  );
}

/** Technical answers clear the question even while the candidate has the floor. */
export function repliedToOpenQuestion(
  messages: ChatMessage[],
  question?: string,
) {
  if (!question) return false;
  const asked = messages.findLastIndex(
    (m) => m.role === "assistant" && m.content.includes(question),
  );
  if (asked < 0) return false;
  return messages
    .slice(asked + 1)
    .some(
      (m) =>
        m.role === "user" &&
        m.source !== "control" &&
        !m.action &&
        m.content.trim().length > 0 &&
        !/[?？]/u.test(m.content) &&
        !/^(?:write|ignore|system:|pause|wait|thanks|ok(?:ay)?\b)/iu.test(
          m.content.trim(),
        ),
    );
}
