import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  _request,
  context,
) => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { logServerEvent } = await import("@/lib/server-events");
    logServerEvent(
      { event: "framework_failure", route: context.routePath, status: 500 },
      error,
    );
  }
};
