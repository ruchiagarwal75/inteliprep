import { adminRead } from "@/lib/admin-api";
import { adminQuery } from "@/lib/admin-query";
import { adminVisitors } from "@/lib/admin-visitors";
export const runtime = "nodejs";
export const GET = adminRead((request) =>
  adminVisitors(adminQuery(new URL(request.url).searchParams).includeExcluded),
);
