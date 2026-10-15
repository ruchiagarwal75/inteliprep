import type { InterviewSelection } from "@/lib/interview-selection";

/** A new regular interview retains the problem and difficulty, never a test-session duration. */
export function nextInterviewSelection(
  current: InterviewSelection,
): InterviewSelection & { durationMinutes: 45 } {
  return {
    problemId: current.problemId,
    level: current.level,
    durationMinutes: 45,
  };
}

/** The old session must finish saving its ended state before its board/transcript are replaced. */
export async function finishBeforeSwitch(
  finish: () => Promise<boolean>,
  switchInterview: () => void | Promise<void>,
): Promise<boolean> {
  if (!(await finish())) return false;
  await switchInterview();
  return true;
}
