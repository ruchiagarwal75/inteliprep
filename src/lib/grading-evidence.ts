import type { InterviewEndSnapshot } from "@/lib/interview-end";
import { isBareAcknowledgement } from "@/lib/requirements-reply";

/** Greetings and pacing controls alone cannot support technical assessment. */
export function hasCandidateAnswer(snapshot: InterviewEndSnapshot): boolean {
  return snapshot.messages.some((message) => {
    if (message.role !== "user") return false;
    const text = message.content.trim();
    return (
      text.length > 0 &&
      !isBareAcknowledgement(text) &&
      !/^(?:hello|hi|hey|done|ready|let's discuss|please let me finish)[.!\s]*$/iu.test(
        text,
      ) &&
      ![
        "I'd like time to work on my drawing. Please hold questions.",
        "I'm ready to explain my design. Please let me finish before asking questions.",
        "I've finished explaining. Let's discuss my design.",
      ].includes(text)
    );
  });
}

export function isMeaningfulFinding(text: string): boolean {
  return (
    text.trim().split(/\s+/u).length >= 6 &&
    !/^(?:in your final diagram|diagram reference|evidence)\s*:/iu.test(
      text.trim(),
    )
  );
}
