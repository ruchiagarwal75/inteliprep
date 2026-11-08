import { adminRead, adminWrite } from "@/lib/admin-api";
import { adminInvites, setBetaInvite } from "@/lib/admin-invites";
import { adminQuery } from "@/lib/admin-query";
import { readJsonBody } from "@/lib/api-request";

export const runtime = "nodejs";
export const GET = adminRead((request) =>
  adminInvites(adminQuery(new URL(request.url).searchParams)),
);
export const POST = adminWrite(async (request) =>
  setBetaInvite(await readJsonBody(request, 1024)),
);
