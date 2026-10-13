import type { InterviewEndSnapshot } from "@/lib/interview-end";
import { isCandidateEvidence } from "@/lib/candidate-evidence";

/** Greetings and pacing controls alone cannot support technical assessment. */
export function hasCandidateAnswer(snapshot: InterviewEndSnapshot): boolean {
  return snapshot.messages.some(isCandidateEvidence);
}

export function isMeaningfulFinding(text: string): boolean {
  return (
    text.trim().split(/\s+/u).length >= 6 &&
    !/^(?:in your final diagram|diagram reference|evidence)\s*:/iu.test(
      text.trim(),
    )
  );
}
