import {
  LIKED_CHOICES,
  RETURN_CHOICES,
  INPUT_PREFERENCE_CHOICES,
  type PracticeFeedbackRecord,
} from "@/lib/practice-feedback";

export function AdminPracticeFeedbackDetail({
  feedback,
}: {
  feedback: PracticeFeedbackRecord;
}) {
  return (
    <section
      aria-label="Practice feedback"
      className="space-y-2 rounded border p-3"
    >
      <h4 className="font-semibold">Practice feedback</h4>
      {feedback.skipped ? (
        <p>Skipped</p>
      ) : (
        <>
          <p>
            Interview experience:{" "}
            {LIKED_CHOICES.find(([value]) => value === feedback.liked)?.[1] ??
              "Not answered"}
          </p>
          <p>
            Would practice again:{" "}
            {RETURN_CHOICES.find(
              ([value]) => value === feedback.wouldReturn,
            )?.[1] ?? "Not answered"}
          </p>
          <p>
            Preferred interview input:{" "}
            {INPUT_PREFERENCE_CHOICES.find(
              ([value]) => value === feedback.inputPreference,
            )?.[1] ?? "Not answered"}
          </p>
          {feedback.comment && (
            <p className="[overflow-wrap:anywhere] whitespace-pre-wrap">
              {feedback.comment}
            </p>
          )}
        </>
      )}
    </section>
  );
}
