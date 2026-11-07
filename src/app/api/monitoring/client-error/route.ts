import { requireCandidateIdentity } from "@/lib/candidate-auth";
import {
  setReportingUser,
  setInterviewReference,
  reportingContext,
} from "@/lib/reporting-context";
import { recordFailure } from "@/lib/reporting-failures";
import { safeReporting } from "@/lib/reporting-write";
import { reportingDb } from "@/lib/reporting-db";
import { readJsonBody, withApiRequest } from "@/lib/api-request";
import { clientErrorReportSchema } from "@/lib/client-error-report";
import { logServerEvent } from "@/lib/server-events";

export const runtime = "nodejs";

export const POST = withApiRequest(
  "clientError",
  "/api/monitoring/client-error",
  async (request, requestId) => {
    const parsed = clientErrorReportSchema.safeParse(
      await readJsonBody(request, 2_048),
    );
    if (!parsed.success)
      return Response.json({ error: "Invalid error report" }, { status: 400 });
    if (parsed.data.kind === "storage") {
      const userId = await requireCandidateIdentity();
      setReportingUser(userId);
      await safeReporting(async () => {
        const rows = parsed.data.interviewId
          ? await reportingDb()`select id from interview_admin.interviews where id=${parsed.data.interviewId} and user_id=${userId}`
          : [];
        if (rows.length && parsed.data.interviewId)
          setInterviewReference(parsed.data.interviewId);
        await recordFailure(
          {
            operation: "save",
            category: "browser_storage",
            source: "browser_report",
            referenceId: parsed.data.fingerprint,
          },
          reportingContext(),
        );
      });
    }
    logServerEvent({
      event: "client_failure",
      requestId,
      route: parsed.data.page,
      kind: `${parsed.data.kind}:${parsed.data.errorType}`,
      fingerprint: parsed.data.fingerprint,
    });
    return new Response(null, { status: 204 });
  },
);
