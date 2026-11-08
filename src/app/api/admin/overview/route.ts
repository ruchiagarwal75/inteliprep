import { adminRead } from "@/lib/admin-api";
import { adminOverview } from "@/lib/admin-overview";
import { adminQuery } from "@/lib/admin-query";
export const runtime = "nodejs";
export const GET = adminRead((request) => {
  const params = new URL(request.url).searchParams;
  // Read-only, owner-authenticated preview diagnostic. Never available in Production.
  if (
    process.env.VERCEL_ENV === "preview" &&
    params.get("diagnostic") === "throw"
  )
    throw new Error("Preview diagnostic probe");
  return adminOverview(adminQuery(params).includeExcluded);
});
