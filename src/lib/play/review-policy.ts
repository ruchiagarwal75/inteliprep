import "server-only";
type ReviewStep = 2 | 5 | 12;
export type ReviewChange =
  | { kind: "keep" }
  | { kind: "remove" }
  | { kind: "schedule"; step: ReviewStep; dueAt: string };
export function reviewChange({
  correct,
  reviewing,
  currentStep,
  now,
}: {
  correct: boolean;
  reviewing: boolean;
  currentStep?: ReviewStep;
  now: Date;
}): ReviewChange {
  if (correct && !reviewing) return { kind: "keep" };
  if (correct && currentStep === 12) return { kind: "remove" };
  const step: ReviewStep = !correct
    ? 2
    : currentStep === 2
      ? 5
      : currentStep === 5
        ? 12
        : 2;
  return {
    kind: "schedule",
    step,
    dueAt: new Date(now.getTime() + step * 86400000).toISOString(),
  };
}
