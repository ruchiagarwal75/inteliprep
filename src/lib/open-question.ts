import type { ChatMessage } from "@/lib/chat";

export function questionAtEnd(reply: string) {
  const text = reply.trimEnd();
  if (!text.endsWith("?") && !text.endsWith("？")) return undefined;
  if (text.length === 1) return text;
  const end = text.length - 2;
  const separator = Math.max(
    ...[".", "!", "?", "？", "\n"].map((mark) => text.lastIndexOf(mark, end)),
  );
  return text.slice(separator + 1).trim();
}
export function hasExplanation(messages: ChatMessage[]) {
  const explicit = messages.some(
    (m) => m.role === "user" && m.action === "explain",
  );
  if (!explicit)
    return messages.some(
      (m) =>
        m.role === "user" &&
        m.source !== "control" &&
        (!m.action || m.action === "explain") &&
        !!m.content.trim(),
    );
  let explaining = false;
  for (const message of messages) {
    if (message.role !== "user") continue;
    if (message.action) explaining = message.action === "explain";
    if (
      explaining &&
      message.source !== "control" &&
      (!message.action || message.action === "explain") &&
      message.content.trim()
    )
      return true;
  }
  return false;
}
export function hasPriorExplanation(messages: ChatMessage[]) {
  const start = messages.findLastIndex(
    (m) => m.role === "user" && m.action === "explain",
  );
  const earlier = messages.slice(0, Math.max(0, start));
  return (
    earlier.some((m) => m.role === "user" && m.action === "explain") &&
    hasExplanation(earlier)
  );
}
export function hasAsk(reply: string) {
  if (/[?？]\s*$/u.test(reply)) return true;
  const ending =
    reply
      .trim()
      .split(/(?<=[.!?])\s+|\n+/u)
      .at(-1) ?? "";
  const instruction = ending.replace(
    /^when (?:(?:you['’]re|you are) )?ready,?\s+/iu,
    "",
  );
  return /^(?:(?:yes|okay|ok|sure)[,!.]?\s+)?(?:please\b|feel free to\b|you can\b|choose\b|draw\b|sketch\b|explain\b|walk\b|(?:finish|conclude)\b|end (?:the|this|your) interview\b|keep\b|take your time\b|go ahead\b|let.s stay on your design\b|continue\b|describe\b|tell me\b|review\b|confirm\b|clarify\b)/iu.test(
    instruction,
  );
}

/** A handoff is an instruction, never an invitation to answer another question. */
export function invitesDrawing(reply: string) {
  const instruction = reply.replace(
    /\b(?:choose|select|click|use) (?:the )?["“]?Start drawing["”]?(?: (?:button|link))?/giu,
    "",
  );
  return /\b(?:start|begin|continue|go ahead (?:and|with)|feel free to)\s+(?:(?:your|the)\s+)?(?:draw(?:ing)?|sketch(?:ing)?|designing)\b|\b(?:start|begin) (?:your |the )?(?:design|approach|architecture) by (?:drawing|sketching)\b|(?:^|[.!,:]\s*)(?:please )?(?:draw|sketch)\b|\b(?:move|turn) to (?:the |your )?whiteboard\b/iu.test(
    instruction,
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
