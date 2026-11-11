import type { InterviewRecoveryFailure } from "@/lib/interview-recovery";

export function InterviewRecoveryNotice({
  failure,
  closed,
}: {
  failure?: InterviewRecoveryFailure;
  closed: boolean;
}) {
  if (closed)
    return (
      <p role="status" className="border-b px-3 py-2 text-sm">
        Closed without scoring. Your chat, drawing, and unsent draft are saved
        in this browser.
      </p>
    );
  if (!failure) return null;
  return (
    <div
      role="alert"
      className="border-warning bg-warning-soft text-warning border-b px-3 py-2 text-sm"
    >
      <p>{failure.message}</p>
      <p className="mt-1">
        Retry cannot restore this checkpoint. Close without scoring to keep your
        chat, drawing, and draft, then start a new interview.
      </p>
    </div>
  );
}
