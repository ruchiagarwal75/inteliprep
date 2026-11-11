import type { ChatMessage } from "@/lib/chat";
import { DESIGN_REDIRECT, isOffTopicRequest } from "@/lib/off-topic";
import { hasInternalIdentifiers } from "@/lib/public-interviewer-reply";
import { isOrderLikeWrapUp } from "@/lib/discussion-closing";
import { repeatedInterviewerSentences } from "@/lib/reply-novelty";

export type AuditFact = { id: string; text: string };
export type AuditFinding = {
  kind: "internal_id" | "on_topic_redirect" | "repeated_fact" | "order_wrap_up";
  messageIndex: number;
  text: string;
  factId?: string;
};
const normalize = (text: string) =>
  text
    .replace(/["“”'‘’]/gu, "")
    .replace(/\s+/gu, " ")
    .trim()
    .toLowerCase();

/** Offline evidence checks. Exact fact matching is not a semantic paraphrase audit. */
export function auditTranscript(
  messages: ChatMessage[],
  facts: AuditFact[] = [],
) {
  const findings: AuditFinding[] = [];
  const repeats: string[] = [];
  const seen: ChatMessage[] = [];
  const disclosed = new Set<string>();
  let candidate: ChatMessage | undefined;
  for (const [messageIndex, message] of messages.entries()) {
    if (message.role === "user") candidate = message;
    if (message.role === "assistant") {
      const add = (kind: AuditFinding["kind"], factId?: string) =>
        findings.push({
          kind,
          messageIndex,
          text: message.content,
          ...(factId ? { factId } : {}),
        });
      if (hasInternalIdentifiers(message.content)) add("internal_id");
      if (isOrderLikeWrapUp(message.content)) add("order_wrap_up");
      // Require technical narration, not merely the absence of a recognized attack.
      if (
        message.content.includes(DESIGN_REDIRECT) &&
        candidate?.source !== "control" &&
        candidate &&
        !isOffTopicRequest(candidate.content) &&
        /\b(?:model|retriev\w*|prompt|injection|attacker|permissions?|ACL|cache|GPU|replica|queue|database|idempotency|evaluation|tokens?)\b/iu.test(
          candidate.content,
        )
      )
        add("on_topic_redirect");
      const text = normalize(message.content);
      for (const fact of facts) {
        if (!fact.text.trim() || !text.includes(normalize(fact.text))) continue;
        if (disclosed.has(fact.id)) add("repeated_fact", fact.id);
        disclosed.add(fact.id);
      }
      repeats.push(...repeatedInterviewerSentences(message.content, seen));
    }
    seen.push(message);
  }
  return { findings, repeatedSentences: repeats };
}
