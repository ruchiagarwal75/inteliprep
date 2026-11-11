import type { ChatMessage } from "@/lib/chat";
import { hasAsk } from "@/lib/open-question";

/** A fact can stand alone. Offer a neutral continuation every third candidate turn. */
export function genaiFactFollowUp(messages: ChatMessage[], answer: string) {
  if (hasAsk(answer)) return;
  const turns = messages.filter(
    (m) => m.role === "user" && m.source !== "control",
  ).length;
  if (!turns || turns % 3) return;
  const prompts = [
    "Is there another requirement you want to check?",
    "What else would you like to clarify?",
    "Do you have another requirement question?",
  ];
  return prompts[(turns / 3 - 1) % prompts.length];
}

/** Preserve a useful invitation without repeating the same question consecutively. */
export function genaiAssumptionInvitation(
  messages: ChatMessage[],
  preferred?: string,
) {
  const previous =
    messages.findLast((m) => m.role === "assistant")?.content ?? "";
  const choices = [
    preferred || "What would you assume?",
    "Which working assumption would you use?",
    "Please state a working assumption for that detail.",
  ];
  return choices.find((choice) => !previous.includes(choice)) ?? choices[2];
}

/** An open invitation asks for a requirement, not a missing value or suggested topic. */
export function genaiGeneralInvitation(messages: ChatMessage[]) {
  const previous =
    messages.findLast((m) => m.role === "assistant")?.content ?? "";
  return (
    [
      "What would you like to know? You can ask about any requirement.",
      "Which requirement would you like to ask about?",
      "What information would help you set the requirements?",
    ].find((text) => !previous.includes(text)) ?? "What would you like to know?"
  );
}
