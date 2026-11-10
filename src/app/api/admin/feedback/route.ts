import { adminRead } from "@/lib/admin-api";
import { adminPracticeFeedback } from "@/lib/admin-practice-feedback";
import { adminQuery } from "@/lib/admin-query";
export const runtime = "nodejs";
export const GET = adminRead((request) =>
  adminPracticeFeedback(adminQuery(new URL(request.url).searchParams)),
);
