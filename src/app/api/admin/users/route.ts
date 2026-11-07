import { adminRead } from "@/lib/admin-api";
import { adminUsers } from "@/lib/admin-users";
import { adminQuery } from "@/lib/admin-query";
export const runtime = "nodejs";
export const GET = adminRead((request) =>
  adminUsers(adminQuery(new URL(request.url).searchParams)),
);
