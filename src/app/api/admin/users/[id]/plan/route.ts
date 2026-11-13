import { z } from "zod";
import { adminWrite } from "@/lib/admin-api";
import { readJsonBody } from "@/lib/api-request";
import { changeMockAccess } from "@/lib/admin-mock-access";

export const runtime = "nodejs";
export const POST = adminWrite(async (request) => {
  const id = z.uuid().parse(new URL(request.url).pathname.split("/").at(-2));
  return changeMockAccess(id, await readJsonBody(request, 1024));
});
