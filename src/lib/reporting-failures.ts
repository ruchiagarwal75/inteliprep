import "server-only";
import { randomUUID } from "node:crypto";
import {
  APIError,
  APIConnectionTimeoutError,
  APIConnectionError,
} from "openai";
import { BetaUnavailableError } from "@/lib/beta-config";
import { reportingDb } from "@/lib/reporting-db";
import {
  reportingContext,
  type ReportingContext,
} from "@/lib/reporting-context";
import { reportingEnvironment } from "@/lib/admin-config";
import { safeReporting, deferReporting } from "@/lib/reporting-write";

export function failureCategory(cause?: unknown) {
  if (cause instanceof BetaUnavailableError)
    return "shared_store_or_configuration";
  if (cause instanceof APIConnectionTimeoutError) return "timeout";
  if (cause instanceof APIConnectionError) return "network";
  if (cause instanceof APIError) {
    if (cause.status === 401 || cause.status === 403)
      return "provider_authentication";
    if (cause.status === 429) return "provider_limit";
    if (cause.status && cause.status >= 500) return "provider_unavailable";
    if (/Timeout/.test(cause.name)) return "timeout";
    if (/Connection/.test(cause.name)) return "network";
    return "provider_request";
  }
  if (cause instanceof Error && cause.name === "AbortError") return "cancelled";
  return "unknown";
}
export type FailureInput = {
  operation: "start" | "ai_response" | "save" | "feedback";
  category: string;
  referenceId?: string;
  source?: "server" | "browser_report";
};
export async function recordFailure(
  input: FailureInput,
  context = reportingContext(),
) {
  if (!context) return;
  const reference = input.referenceId ?? context.requestId;
  await safeReporting(async () => {
    const sql = reportingDb();
    await sql`insert into interview_admin.failures
      (id,request_id,interview_id,user_id,environment,is_test,operation,category,reference_id,source)
      values (${randomUUID()},${context.requestId},${context.interviewId ?? null},${context.userId ?? null},${reportingEnvironment()},${context.isTest ?? false},${input.operation},${input.category},${reference},${input.source ?? "server"})
      on conflict (request_id,operation,reference_id) do nothing`;
    if (input.operation === "feedback" && context.interviewId)
      await sql`update interview_admin.interviews set feedback_status = case when feedback_status='generated' then 'generated' else 'failed' end,
        feedback_failed_at=coalesce(feedback_failed_at,now()) where id=${context.interviewId} and user_id=${context.userId ?? null}`;
  });
}
export function captureLoggedFailure(
  event: { event: string; route?: string; requestId?: string },
  cause?: unknown,
) {
  if (!event.event.includes("failure") || event.event === "client_failure")
    return;
  const current = reportingContext();
  if (!current || !/^\/api\/(?:interview\/|chat)/.test(current.route)) return;
  const context: ReportingContext = { ...current };
  const operation =
    event.event === "grading_failure"
      ? "feedback"
      : event.route?.includes("session")
        ? "save"
        : context.route.endsWith("/start")
          ? "start"
          : context.route.endsWith("/end")
            ? "feedback"
            : "ai_response";
  const category =
    operation === "save" ? "shared_store" : failureCategory(cause);
  deferReporting(() =>
    recordFailure(
      {
        operation,
        category,
        referenceId:
          operation === "ai_response" || operation === "feedback"
            ? context.failureReferenceId
            : undefined,
      },
      context,
    ),
  );
}
