import { adminRead, adminWrite } from "@/lib/admin-api";
import {
  adminInvites,
  setBetaInvite,
  adminInviteQuery,
} from "@/lib/admin-invites";
import { readJsonBody } from "@/lib/api-request";

export const runtime = "nodejs";
export const GET = adminRead((request) =>
  adminInvites(adminInviteQuery(new URL(request.url).searchParams)),
);
export const POST = adminWrite(async (request) =>
  setBetaInvite(await readJsonBody(request, 1024)),
);
