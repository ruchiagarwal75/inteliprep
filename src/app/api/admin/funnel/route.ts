import { adminRead } from "@/lib/admin-api";
import { adminBetaFunnel } from "@/lib/admin-beta-funnel";
import { betaFunnelQuery } from "@/lib/beta-funnel-query";
export const runtime = "nodejs";
export const GET = adminRead((request) =>
  adminBetaFunnel(betaFunnelQuery(new URL(request.url).searchParams)),
);
