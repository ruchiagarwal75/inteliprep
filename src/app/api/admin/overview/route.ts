import { adminRead } from "@/lib/admin-api";
import { adminOverview } from "@/lib/admin-overview";
import { adminQuery } from "@/lib/admin-query";
export const runtime = "nodejs";
export const GET = adminRead((request) =>
  adminOverview(adminQuery(new URL(request.url).searchParams).includeExcluded),
);
