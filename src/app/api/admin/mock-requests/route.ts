import { adminWrite } from "@/lib/admin-api";
import { readJsonBody } from "@/lib/api-request";
import { changeMockTrial } from "@/lib/admin-mock-trial-write";
export const POST = adminWrite(async (request) =>
  changeMockTrial(await readJsonBody(request, 2048)),
);
