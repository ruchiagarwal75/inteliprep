import { z } from "zod";
export const ADMIN_PAGE_SIZE = 20;
export function adminQuery(params: URLSearchParams) {
  return z
    .object({
      search: z.string().trim().max(120).default(""),
      page: z.coerce.number().int().min(1).max(100000).default(1),
      includeExcluded: z.boolean(),
    })
    .parse({
      search: params.get("search") ?? "",
      page: params.get("page") ?? 1,
      includeExcluded: params.get("includeExcluded") === "1",
    });
}
