import type { AdminInterview } from "@/lib/admin-records";
import { elapsedInterviewTime } from "@/lib/reporting-duration";
import { formatInterviewTime } from "@/lib/interview-timer";
import { getProblem } from "@/lib/problems";
import { AdminCost, AdminTime } from "@/components/admin-format";
import { AdminPracticeFeedbackDetail } from "@/components/admin-practice-feedback-detail";
export function AdminInterviewDetail({ item }: { item: AdminInterview }) {
  const duration = elapsedInterviewTime(item);
  return (
    <article className="space-y-3 rounded-lg border p-4">
      <h3 className="text-lg font-semibold">
        {getProblem(item.problemId)?.title ?? item.problemId} · {item.level}
      </h3>
      <p>
        Interview: <strong>{item.status}</strong> · Feedback:{" "}
        <strong>{item.feedbackStatus}</strong>
        {item.isTest && " · Test session"}
      </p>
      <p className="text-xs break-all">Interview ID: {item.id}</p>
      <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="font-medium">Started (UTC)</dt>
          <dd>
            <AdminTime value={item.startedAt} />
          </dd>
        </div>
        <div>
          <dt className="font-medium">Last interview activity (UTC)</dt>
          <dd>
            <AdminTime value={item.lastActivityAt} />
          </dd>
        </div>
        <div>
          <dt className="font-medium">Ended / exited (UTC)</dt>
          <dd>
            {item.endedAt ? (
              <AdminTime value={item.endedAt} />
            ) : (
              "Not explicitly ended"
            )}
          </dd>
        </div>
        <div>
          <dt className="font-medium">Elapsed interview time (mm:ss)</dt>
          <dd>
            {duration.seconds === null
              ? "Unavailable"
              : formatInterviewTime(duration.seconds)}
            <span className="block">{duration.label}</span>
          </dd>
        </div>
      </dl>
      {item.coverage === "partial" && (
        <p className="text-sm">
          Partial history: recovered from a verified session. Earlier activity
          and AI usage may be unavailable.
        </p>
      )}
      <p>
        <strong>Estimated AI cost:</strong> <AdminCost cost={item.cost} />
      </p>
      {item.failure && (
        <p className="text-sm break-all">
          Latest failure: {item.failure.operation} · {item.failure.category} ·{" "}
          <AdminTime value={item.failure.occurredAt} /> · Reference:{" "}
          {item.failure.referenceId}
          {item.failure.source === "browser_report" && " (browser-reported)"}
        </p>
      )}
      {item.feedback ? (
        <details>
          <summary className="cursor-pointer font-medium">
            Stored score and feedback
          </summary>
          <div className="mt-3 space-y-3">
            <p>{item.feedback.summary}</p>
            <p>Signal: {item.feedback.signal.replaceAll("_", " ")}</p>
            <ul className="space-y-2">
              {item.feedback.areas.map((area) => (
                <li key={area.area}>
                  <strong>
                    {area.area}:{" "}
                    {area.score === null ? "Not assessed" : `${area.score}/4`}
                  </strong>
                  <p>{area.rationale}</p>
                </li>
              ))}
            </ul>
            {item.feedback.gaps.length > 0 && (
              <div>
                <h4 className="font-semibold">Feedback gaps</h4>
                <ul className="list-inside list-disc">
                  {item.feedback.gaps.map((text) => (
                    <li key={text}>{text}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      ) : (
        <p className="text-sm">
          No stored feedback available. Interview status is independent of
          feedback generation.
        </p>
      )}
      {item.practiceFeedback && (
        <AdminPracticeFeedbackDetail feedback={item.practiceFeedback} />
      )}
    </article>
  );
}
