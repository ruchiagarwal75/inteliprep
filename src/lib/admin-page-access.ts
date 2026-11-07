import "server-only";
import { notFound, redirect } from "next/navigation";
import { AdminAccessError, requireAdminIdentity } from "@/lib/admin-auth";
export async function adminPageAccess() {
  try {
    await requireAdminIdentity();
  } catch (cause) {
    if (cause instanceof AdminAccessError && cause.status === 401)
      redirect("/sign-in?next=/admin");
    if (cause instanceof AdminAccessError && cause.status === 403) notFound();
    throw new Error("Admin authentication is temporarily unavailable.");
  }
}
