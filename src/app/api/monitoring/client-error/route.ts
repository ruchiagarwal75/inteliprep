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
