import "server-only";
import { supabaseServer } from "@/lib/supabase-server";
import { configuredAdminId } from "@/lib/admin-config";

export class AdminAccessError extends Error {
  constructor(public readonly status: 401 | 403 | 503) {
    super(
      status === 503
        ? "Admin access is unavailable."
        : "Admin access is restricted.",
    );
  }
}
/** Revalidate with Auth; never authorize from editable metadata or an unverified cookie. */
export async function requireAdminIdentity() {
  const expected = configuredAdminId();
  if (!expected) throw new AdminAccessError(403);
  try {
    const client = await supabaseServer();
    const { data, error } = await client.auth.getUser();
    if (error)
      throw new AdminAccessError(
        error.status && error.status < 500 ? 401 : 503,
      );
    const user = data.user;
    if (!user || user.is_anonymous) throw new AdminAccessError(401);
    if (user.id !== expected) throw new AdminAccessError(403);
    return user.id;
  } catch (cause) {
    if (cause instanceof AdminAccessError) throw cause;
    throw new AdminAccessError(503);
  }
}
