import { plainInterviewerText } from "@/lib/interviewer-reply-filter";
import { invitesDrawing } from "@/lib/open-question";
import {
  DRAWING_WAIT_REPLY,
  EXPLANATION_WAIT_REPLY,
} from "@/lib/drawing-reply";

export const INTERVIEW_OPENER =
  "Let's start with requirements. What would you want to know before changing anything?";

/** Display-only: the verified transcript and grading evidence remain unchanged. */
export function interviewerChatText(content: string, opening?: string) {
  if (opening && content === opening) return INTERVIEW_OPENER;
  if ([DRAWING_WAIT_REPLY, EXPLANATION_WAIT_REPLY].includes(content.trim()))
    return "";
  return plainInterviewerText(content)
    .split(/(?<=[.!?])\s+|\n+/u)
    .filter(
      (sentence) =>
        !invitesDrawing(sentence) &&
        !/\b(?:choose|select|click|use) (?:the )?(?:Ready to explain|Done explaining|Start drawing|Pause to draw|Back to drawing)\b/iu.test(
          sentence,
        ) &&
        !/^(?:I(?:'ll| will) (?:hold|wait|listen)|Take your time|Go ahead with your explanation|Please review your requirements)/iu.test(
          sentence,
        ),
    )
    .join(" ")
    .trim()
    .replaceAll("—", ", ");
}
