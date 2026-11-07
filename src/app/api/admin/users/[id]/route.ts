import { adminRead } from "@/lib/admin-api";
import { adminUserDetail } from "@/lib/admin-user-detail";
import { adminQuery } from "@/lib/admin-query";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return adminRead(async () => {
    const query = adminQuery(new URL(request.url).searchParams);
    return {
      result:
        (await adminUserDetail(
          (await params).id,
          query.page,
          query.includeExcluded,
        )) ?? null,
    };
  })(request);
}
